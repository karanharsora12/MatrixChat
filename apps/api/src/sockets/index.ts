import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '../db/index.js';
import { sessions, users, conversationParticipants, messages } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { hashSessionToken } from '../utils/crypto.js';
import { SESSION_COOKIE_NAME } from '../middleware/auth.js';
import { messagesService } from '../modules/messages/messages.service.js';
import { isValidUUID } from '../utils/validation.js';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      phoneNumber: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  };
}

/**
 * Native cookie header parser
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const list: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) {
      list[key] = decodeURIComponent(parts.join('=').trim());
    }
  });
  return list;
}

// Track connected socket counts per user to manage true online/offline presence
const connectedUsers = new Map<string, number>();
let ioInstance: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Centralized Real-Time Event Dispatchers
 * Guaranteed to broadcast whether action initiated via REST API or WebSocket
 */
export async function emitMessageReceived(conversationId: string, message: any) {
  if (!ioInstance) return;

  // 1. Deliver to conversation room
  ioInstance.to(`conv:${conversationId}`).emit('message_received', {
    message,
    conversationId,
  });

  // 2. Deliver to each participant's personal room for sidebar updates & badge counts
  try {
    const participants = await db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));

    for (const p of participants) {
      ioInstance.to(`user:${p.userId}`).emit('conversation_updated', {
        conversationId,
        lastMessage: message,
        senderId: message.senderId,
      });
    }
  } catch (err) {
    console.error('[Socket emitMessageReceived Error]', err);
  }
}

export function emitMessageDeleted(conversationId: string, messageId: string) {
  if (!ioInstance) return;
  ioInstance.to(`conv:${conversationId}`).emit('message_deleted', {
    messageId,
    conversationId,
  });
}

export function emitMessagesRead(conversationId: string, readByUserId: string) {
  if (!ioInstance) return;
  ioInstance.to(`conv:${conversationId}`).emit('messages_read', {
    conversationId,
    readByUserId,
    readAt: new Date().toISOString(),
  });
}

export function setupSocketServer(io: SocketIOServer) {
  ioInstance = io;

  // 1. Handshake Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let rawToken: string | undefined;

      // Extract cookie from handshake headers
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        const parsed = parseCookies(cookieHeader);
        rawToken = parsed[SESSION_COOKIE_NAME];
      }

      // Fallback: auth token in handshake auth object
      if (!rawToken && socket.handshake.auth?.token) {
        rawToken = socket.handshake.auth.token;
      }

      if (!rawToken || typeof rawToken !== 'string') {
        return next(new Error('Authentication failed: Missing session token.'));
      }

      const tokenHash = hashSessionToken(rawToken);

      const [foundSession] = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
        .limit(1);

      if (!foundSession) {
        return next(new Error('Authentication failed: Invalid or expired session.'));
      }

      const [foundUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, foundSession.userId))
        .limit(1);

      if (!foundUser) {
        return next(new Error('Authentication failed: User account does not exist.'));
      }

      socket.data.user = {
        id: foundUser.id,
        phoneNumber: foundUser.phoneNumber,
        displayName: foundUser.displayName,
        avatarUrl: foundUser.avatarUrl,
      };

      next();
    } catch (err) {
      console.error('[Socket Handshake Auth Error]', err);
      next(new Error('Internal socket authentication error.'));
    }
  });

  // 2. Connection Handler
  io.on('connection', async (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const userId = socket.data.user.id;

    // Join personal user notification room
    socket.join(`user:${userId}`);

    // Update connection count
    const currentCount = connectedUsers.get(userId) || 0;
    connectedUsers.set(userId, currentCount + 1);

    // If first connection for this user, mark online in DB and broadcast presence
    if (currentCount === 0) {
      await db
        .update(users)
        .set({ isOnline: true, lastSeenAt: new Date() })
        .where(eq(users.id, userId));

      io.emit('presence_changed', {
        userId,
        isOnline: true,
        lastSeenAt: new Date().toISOString(),
      });
    }

    console.log(`[Socket] User connected: ${userId} (${socket.id})`);

    // 3. Conversation Room Authorization and Joining
    socket.on('join_conversation', async (data: { conversationId: string }, callback) => {
      try {
        const { conversationId } = data || {};
        if (!isValidUUID(conversationId)) {
          if (callback) callback({ error: 'Invalid conversation ID' });
          return;
        }

        // Authorize: check if user is a participant
        const [isParticipant] = await db
          .select()
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.userId, userId)
            )
          )
          .limit(1);

        if (!isParticipant) {
          if (callback) callback({ error: 'Unauthorized to join conversation.' });
          return;
        }

        socket.join(`conv:${conversationId}`);
        console.log(`[Socket] User ${userId} joined room conv:${conversationId}`);
        if (callback) callback({ success: true, conversationId });
      } catch (err) {
        console.error('[Join Conversation Error]', err);
        if (callback) callback({ error: 'Failed to join conversation room.' });
      }
    });

    // 4. Leave Conversation Room
    socket.on('leave_conversation', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.leave(`conv:${data.conversationId}`);
        console.log(`[Socket] User ${userId} left room conv:${data.conversationId}`);
      }
    });

    // 5. Real-Time Message Dispatch
    socket.on('send_message', async (data: any, callback) => {
      try {
        const { conversationId, content, replyToId, messageType, attachment } = data || {};

        const newMsg = await messagesService.sendMessage(
          conversationId,
          userId,
          content,
          replyToId,
          messageType,
          attachment
        );

        // Broadcast to everyone in conversation room and participant user rooms
        await emitMessageReceived(conversationId, newMsg);

        if (callback) callback({ success: true, message: newMsg });
      } catch (err: any) {
        console.error('[Socket send_message error]', err);
        if (callback) callback({ error: err.message || 'Failed to send message.' });
      }
    });

    // 6. Typing Indicators
    socket.on('typing_start', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.to(`conv:${data.conversationId}`).emit('user_typing', {
          conversationId: data.conversationId,
          userId,
          isTyping: true,
        });
      }
    });

    socket.on('typing_stop', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.to(`conv:${data.conversationId}`).emit('user_typing', {
          conversationId: data.conversationId,
          userId,
          isTyping: false,
        });
      }
    });

    // 7. Read Receipts Update
    socket.on('mark_read', async (data: { conversationId: string }) => {
      try {
        if (!data?.conversationId) return;
        await messagesService.markRead(data.conversationId, userId);
        emitMessagesRead(data.conversationId, userId);
      } catch (err) {
        console.error('[Socket mark_read error]', err);
      }
    });

    // 8. Disconnection Handler
    socket.on('disconnect', async () => {
      console.log(`[Socket] User disconnected: ${userId} (${socket.id})`);
      const count = connectedUsers.get(userId) || 1;
      const newCount = count - 1;

      if (newCount <= 0) {
        connectedUsers.delete(userId);
        const now = new Date();

        await db
          .update(users)
          .set({ isOnline: false, lastSeenAt: now })
          .where(eq(users.id, userId));

        io.emit('presence_changed', {
          userId,
          isOnline: false,
          lastSeenAt: now.toISOString(),
        });
      } else {
        connectedUsers.set(userId, newCount);
      }
    });
  });
}
