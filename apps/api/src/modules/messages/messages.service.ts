import { db } from '../../db/index.js';
import {
  messages,
  messageReceipts,
  attachments,
  conversations,
  conversationParticipants,
  userBlocks,
  users,
} from '../../db/schema.js';
import { eq, and, or, desc, sql, lt, inArray } from 'drizzle-orm';
import { isValidUUID, sanitizeString } from '../../utils/validation.js';

export class MessagesService {
  /**
   * Fetch paginated messages for conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    limit = 50,
    beforeTimestamp?: string
  ) {
    if (!isValidUUID(conversationId)) {
      throw { status: 400, message: 'Invalid conversation ID' };
    }

    // Verify participant
    const [part] = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!part) {
      throw { status: 403, message: 'Not authorized to view messages in this conversation.' };
    }

    // Query messages with cursor
    let queryConditions = eq(messages.conversationId, conversationId);

    if (beforeTimestamp) {
      const beforeDate = new Date(beforeTimestamp);
      if (!isNaN(beforeDate.getTime())) {
        queryConditions = and(queryConditions, lt(messages.createdAt, beforeDate)) as any;
      }
    }

    const fetchedMessages = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        replyToId: messages.replyToId,
        content: messages.content,
        messageType: messages.messageType,
        isDeleted: messages.isDeleted,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
      })
      .from(messages)
      .where(queryConditions)
      .orderBy(desc(messages.createdAt))
      .limit(Math.min(limit, 100));

    if (fetchedMessages.length === 0) return [];

    const msgIds = fetchedMessages.map((m) => m.id);

    // Fetch receipts for these messages
    const receipts = await db
      .select()
      .from(messageReceipts)
      .where(inArray(messageReceipts.messageId, msgIds));

    const receiptMap = new Map<string, (typeof receipts)[0]>();
    for (const r of receipts) {
      receiptMap.set(r.messageId, r);
    }

    // Fetch attachments
    const msgAttachments = await db
      .select()
      .from(attachments)
      .where(inArray(attachments.messageId, msgIds));

    const attachmentMap = new Map<string, (typeof msgAttachments)[0]>();
    for (const a of msgAttachments) {
      attachmentMap.set(a.messageId, a);
    }

    // Fetch reply preview if any
    const replyIds = fetchedMessages
      .map((m) => m.replyToId)
      .filter((id): id is string => Boolean(id));

    let replyMap = new Map<string, { id: string; content: string; senderId: string }>();
    if (replyIds.length > 0) {
      const replyMsgs = await db
        .select({
          id: messages.id,
          content: messages.content,
          senderId: messages.senderId,
          isDeleted: messages.isDeleted,
        })
        .from(messages)
        .where(inArray(messages.id, replyIds));

      replyMap = new Map(
        replyMsgs.map((r) => [
          r.id,
          {
            id: r.id,
            content: r.isDeleted ? 'This message was deleted' : r.content,
            senderId: r.senderId,
          },
        ])
      );
    }

    // Return chronological order (oldest to newest)
    return fetchedMessages
      .map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        replyToId: m.replyToId,
        replyTo: m.replyToId ? replyMap.get(m.replyToId) || null : null,
        content: m.isDeleted ? 'This message was deleted' : m.content,
        messageType: m.messageType,
        isDeleted: m.isDeleted,
        createdAt: m.createdAt,
        receipt: receiptMap.get(m.id) || null,
        attachment: attachmentMap.get(m.id) || null,
      }))
      .reverse();
  }

  /**
   * Persist a new message into the database
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    replyToId?: string,
    messageType = 'text',
    attachmentMeta?: { fileName: string; filePath: string; mimeType: string; fileSize: number }
  ) {
    if (!isValidUUID(conversationId)) {
      throw { status: 400, message: 'Invalid conversation ID' };
    }

    // Native validation of text content
    const sanitizedContent = sanitizeString(content, 4000);
    if (!sanitizedContent && !attachmentMeta) {
      throw { status: 400, message: 'Message content or attachment is required.' };
    }

    // Verify sender is participant
    const participants = await db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));

    const isSenderParticipant = participants.some((p) => p.userId === senderId);
    if (!isSenderParticipant) {
      throw { status: 403, message: 'You are not a participant in this conversation.' };
    }

    // Check blocking status with other participants
    const otherParticipantIds = participants
      .filter((p) => p.userId !== senderId)
      .map((p) => p.userId);

    if (otherParticipantIds.length > 0) {
      const [block] = await db
        .select()
        .from(userBlocks)
        .where(
          or(
            and(
              eq(userBlocks.blockerId, senderId),
              inArray(userBlocks.blockedId, otherParticipantIds)
            ),
            and(
              inArray(userBlocks.blockerId, otherParticipantIds),
              eq(userBlocks.blockedId, senderId)
            )
          )
        )
        .limit(1);

      if (block) {
        throw { status: 403, message: 'Cannot send message. Communication is blocked.' };
      }
    }

    // Validate replyToId if present
    if (replyToId) {
      if (!isValidUUID(replyToId)) {
        throw { status: 400, message: 'Invalid replyToId.' };
      }
      const [replyMsg] = await db
        .select()
        .from(messages)
        .where(and(eq(messages.id, replyToId), eq(messages.conversationId, conversationId)))
        .limit(1);
      if (!replyMsg) {
        throw { status: 400, message: 'Reply target message does not exist in this chat.' };
      }
    }

    // Persist in transaction
    const finalMsg = await db.transaction(async (tx) => {
      const [newMsg] = await tx
        .insert(messages)
        .values({
          conversationId,
          senderId,
          replyToId: replyToId || null,
          content: sanitizedContent || (attachmentMeta ? attachmentMeta.fileName : ''),
          messageType: messageType || 'text',
          isDeleted: false,
        })
        .returning();

      // Update conversation lastMessageAt
      await tx
        .update(conversations)
        .set({ lastMessageAt: newMsg.createdAt, updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));

      // Create receipts for recipients
      for (const recId of otherParticipantIds) {
        await tx.insert(messageReceipts).values({
          messageId: newMsg.id,
          userId: recId,
          status: 'sent',
        });
      }

      // If attachment is attached
      let attachmentRecord = null;
      if (attachmentMeta) {
        const [att] = await tx
          .insert(attachments)
          .values({
            messageId: newMsg.id,
            fileName: attachmentMeta.fileName,
            filePath: attachmentMeta.filePath,
            mimeType: attachmentMeta.mimeType,
            fileSize: attachmentMeta.fileSize,
          })
          .returning();
        attachmentRecord = att;
      }

      return {
        message: newMsg,
        attachment: attachmentRecord,
      };
    });

    return {
      id: finalMsg.message.id,
      conversationId: finalMsg.message.conversationId,
      senderId: finalMsg.message.senderId,
      replyToId: finalMsg.message.replyToId,
      content: finalMsg.message.content,
      messageType: finalMsg.message.messageType,
      isDeleted: false,
      createdAt: finalMsg.message.createdAt,
      attachment: finalMsg.attachment,
      receipt: {
        status: 'sent',
      },
    };
  }

  /**
   * Soft delete a message
   */
  async deleteMessage(messageId: string, userId: string) {
    if (!isValidUUID(messageId)) {
      throw { status: 400, message: 'Invalid message ID' };
    }

    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
    if (!msg) {
      throw { status: 404, message: 'Message not found' };
    }

    if (msg.senderId !== userId) {
      throw { status: 403, message: 'You can only delete messages sent by you.' };
    }

    const [updated] = await db
      .update(messages)
      .set({ isDeleted: true, content: 'This message was deleted', updatedAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning();

    return updated;
  }

  /**
   * Mark messages as read for user in conversation
   */
  async markRead(conversationId: string, userId: string) {
    if (!isValidUUID(conversationId)) return;

    const now = new Date();

    // 1. Update participant lastReadAt
    await db
      .update(conversationParticipants)
      .set({ lastReadAt: now })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    // 2. Update messageReceipts where userId is recipient and status != 'read'
    const pendingReceipts = await db
      .select({ id: messageReceipts.id, messageId: messageReceipts.messageId })
      .from(messageReceipts)
      .innerJoin(messages, eq(messages.id, messageReceipts.messageId))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messageReceipts.userId, userId),
          sql`${messageReceipts.status} != 'read'`
        )
      );

    if (pendingReceipts.length > 0) {
      const receiptIds = pendingReceipts.map((r) => r.id);
      await db
        .update(messageReceipts)
        .set({ status: 'read', readAt: now, updatedAt: now })
        .where(inArray(messageReceipts.id, receiptIds));
    }

    return { success: true, updatedCount: pendingReceipts.length };
  }
}

export const messagesService = new MessagesService();
