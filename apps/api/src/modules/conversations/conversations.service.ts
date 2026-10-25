import { db } from '../../db/index.js';
import {
  conversations,
  conversationParticipants,
  messages,
  users,
  userBlocks,
  userContacts,
} from '../../db/schema.js';
import { eq, and, or, desc, sql, inArray } from 'drizzle-orm';
import { isValidUUID } from '../../utils/validation.js';

export class ConversationsService {
  /**
   * List all conversations for the user with last message, participant details, and unread count
   */
  async listConversations(userId: string) {
    // 1. Find all conversations the user is a participant of
    const userParts = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        isPinned: conversationParticipants.isPinned,
        isMuted: conversationParticipants.isMuted,
        lastReadAt: conversationParticipants.lastReadAt,
        convType: conversations.type,
        lastMessageAt: conversations.lastMessageAt,
      })
      .from(conversationParticipants)
      .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
      .where(eq(conversationParticipants.userId, userId))
      .orderBy(desc(conversationParticipants.isPinned), desc(conversations.lastMessageAt));

    if (userParts.length === 0) return [];

    const convIds = userParts.map((p) => p.conversationId);

    // 2. Fetch all other participants in these conversations
    const otherParticipants = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        userId: users.id,
        phoneNumber: users.phoneNumber,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        about: users.about,
        isOnline: users.isOnline,
        lastSeenAt: users.lastSeenAt,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .where(
        and(
          inArray(conversationParticipants.conversationId, convIds),
          sql`${conversationParticipants.userId} != ${userId}`
        )
      );

    // 3. Fetch user's saved contacts to display friendly custom names
    const savedContacts = await db
      .select()
      .from(userContacts)
      .where(eq(userContacts.userId, userId));
    const contactMap = new Map(savedContacts.map((c) => [c.contactUserId, c.customName]));

    // 4. Fetch the latest message for each conversation
    const latestMessages = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        messageType: messages.messageType,
        isDeleted: messages.isDeleted,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, convIds))
      .orderBy(desc(messages.createdAt));

    const latestMsgMap = new Map<string, (typeof latestMessages)[0]>();
    for (const msg of latestMessages) {
      if (!latestMsgMap.has(msg.conversationId)) {
        latestMsgMap.set(msg.conversationId, msg);
      }
    }

    // 5. Calculate unread counts
    const unreadResults = await db
      .select({
        conversationId: messages.conversationId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(messages)
      .innerJoin(
        conversationParticipants,
        and(
          eq(conversationParticipants.conversationId, messages.conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .where(
        and(
          inArray(messages.conversationId, convIds),
          sql`${messages.senderId} != ${userId}`,
          sql`(${conversationParticipants.lastReadAt} IS NULL OR ${messages.createdAt} > ${conversationParticipants.lastReadAt})`
        )
      )
      .groupBy(messages.conversationId);

    const unreadMap = new Map(unreadResults.map((r) => [r.conversationId, r.count]));

    // 6. Map and return
    const otherPartMap = new Map<string, (typeof otherParticipants)[0]>();
    for (const op of otherParticipants) {
      otherPartMap.set(op.conversationId, op);
    }

    return userParts.map((part) => {
      const other = otherPartMap.get(part.conversationId);
      const customName = other ? contactMap.get(other.userId) : null;
      const lastMsg = latestMsgMap.get(part.conversationId);

      return {
        id: part.conversationId,
        type: part.convType,
        isPinned: part.isPinned,
        isMuted: part.isMuted,
        lastReadAt: part.lastReadAt,
        lastMessageAt: part.lastMessageAt,
        unreadCount: unreadMap.get(part.conversationId) || 0,
        otherUser: other
          ? {
              id: other.userId,
              name: customName || other.displayName || 'MatrixChat User',
              displayName: other.displayName,
              avatarUrl: other.avatarUrl,
              about: other.about,
              isOnline: other.isOnline,
              lastSeenAt: other.lastSeenAt,
              phoneNumber: other.phoneNumber,
            }
          : null,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              content: lastMsg.isDeleted ? 'This message was deleted' : lastMsg.content,
              messageType: lastMsg.messageType,
              senderId: lastMsg.senderId,
              isDeleted: lastMsg.isDeleted,
              createdAt: lastMsg.createdAt,
            }
          : null,
      };
    });
  }

  /**
   * Get or create a 1-to-1 direct conversation idempotently
   */
  async getOrCreateDirectConversation(userId: string, targetUserId: string) {
    if (!isValidUUID(targetUserId)) {
      throw { status: 400, message: 'Invalid target user ID.' };
    }
    if (userId === targetUserId) {
      throw { status: 400, message: 'Cannot start a conversation with yourself.' };
    }

    // Check if target user exists
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!targetUser) {
      throw { status: 404, message: 'Target user does not exist.' };
    }

    // Check block list in both directions
    const [isBlocked] = await db
      .select()
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, targetUserId)),
          and(eq(userBlocks.blockerId, targetUserId), eq(userBlocks.blockedId, userId))
        )
      )
      .limit(1);

    if (isBlocked) {
      throw { status: 403, message: 'Cannot start conversation. Communication is blocked.' };
    }

    // Check if a direct conversation already exists between these 2 users
    const existing = await db
      .select({
        conversationId: conversationParticipants.conversationId,
      })
      .from(conversationParticipants)
      .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
      .where(
        and(
          eq(conversations.type, 'direct'),
          or(eq(conversationParticipants.userId, userId), eq(conversationParticipants.userId, targetUserId))
        )
      )
      .groupBy(conversationParticipants.conversationId)
      .having(sql`count(${conversationParticipants.userId}) = 2`);

    if (existing.length > 0) {
      const convId = existing[0].conversationId;
      return this.getConversationDetails(convId, userId);
    }

    // Create new conversation in transaction
    const newConv = await db.transaction(async (tx) => {
      const [conv] = await tx
        .insert(conversations)
        .values({
          type: 'direct',
          lastMessageAt: new Date(),
        })
        .returning();

      await tx.insert(conversationParticipants).values([
        { conversationId: conv.id, userId },
        { conversationId: conv.id, userId: targetUserId },
      ]);

      return conv;
    });

    return this.getConversationDetails(newConv.id, userId);
  }

  /**
   * Get single conversation details with authorized participant verification
   */
  async getConversationDetails(conversationId: string, userId: string) {
    if (!isValidUUID(conversationId)) {
      throw { status: 400, message: 'Invalid conversation ID format.' };
    }

    // Verify requesting user is participant
    const [userPart] = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!userPart) {
      throw { status: 403, message: 'Access denied. You are not a participant in this conversation.' };
    }

    // Fetch conversation record
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    // Fetch other participant
    const [otherPart] = await db
      .select({
        id: users.id,
        phoneNumber: users.phoneNumber,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        about: users.about,
        isOnline: users.isOnline,
        lastSeenAt: users.lastSeenAt,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          sql`${conversationParticipants.userId} != ${userId}`
        )
      )
      .limit(1);

    // Check contact nickname
    let customName: string | null = null;
    if (otherPart) {
      const [contact] = await db
        .select()
        .from(userContacts)
        .where(and(eq(userContacts.userId, userId), eq(userContacts.contactUserId, otherPart.id)))
        .limit(1);
      customName = contact?.customName || null;
    }

    return {
      id: conv.id,
      type: conv.type,
      isPinned: userPart.isPinned,
      isMuted: userPart.isMuted,
      lastReadAt: userPart.lastReadAt,
      lastMessageAt: conv.lastMessageAt,
      otherUser: otherPart
        ? {
            id: otherPart.id,
            name: customName || otherPart.displayName || 'MatrixChat User',
            displayName: otherPart.displayName,
            avatarUrl: otherPart.avatarUrl,
            about: otherPart.about,
            isOnline: otherPart.isOnline,
            lastSeenAt: otherPart.lastSeenAt,
            phoneNumber: otherPart.phoneNumber,
          }
        : null,
    };
  }

  /**
   * Update participant settings (Pin / Mute)
   */
  async updateParticipantSettings(
    conversationId: string,
    userId: string,
    settings: { isPinned?: boolean; isMuted?: boolean }
  ) {
    if (!isValidUUID(conversationId)) {
      throw { status: 400, message: 'Invalid conversation ID.' };
    }

    const updatePayload: Record<string, boolean> = {};
    if (typeof settings.isPinned === 'boolean') updatePayload.isPinned = settings.isPinned;
    if (typeof settings.isMuted === 'boolean') updatePayload.isMuted = settings.isMuted;

    const [updated] = await db
      .update(conversationParticipants)
      .set(updatePayload)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .returning();

    return updated;
  }
}

export const conversationsService = new ConversationsService();
