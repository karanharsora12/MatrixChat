import { Request, Response } from 'express';
import { messagesService } from './messages.service.js';
import { emitMessageReceived, emitMessageDeleted, emitMessagesRead } from '../../sockets/index.js';
import { db } from '../../db/index.js';
import { messages } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export class MessagesController {
  async getMessages(req: Request, res: Response) {
    try {
      const conversationId = Array.isArray(req.params.conversationId)
        ? req.params.conversationId[0]
        : req.params.conversationId;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const before = req.query.before as string | undefined;

      const msgs = await messagesService.getMessages(conversationId, req.user!.id, limit, before);
      res.status(200).json(msgs);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || 'Failed to fetch messages' });
    }
  }

  async sendMessage(req: Request, res: Response) {
    try {
      const conversationId = Array.isArray(req.params.conversationId)
        ? req.params.conversationId[0]
        : req.params.conversationId;
      const { content, replyToId, messageType, attachment } = req.body || {};

      const msg = await messagesService.sendMessage(
        conversationId,
        req.user!.id,
        content,
        replyToId,
        messageType,
        attachment
      );

      // Real-time broadcast to all clients in conversation & participant rooms
      await emitMessageReceived(conversationId, msg);

      res.status(201).json(msg);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || 'Failed to send message' });
    }
  }

  async deleteMessage(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Find conversationId before delete
      const [found] = await db.select({ conversationId: messages.conversationId }).from(messages).where(eq(messages.id, id)).limit(1);

      const updated = await messagesService.deleteMessage(id, req.user!.id);

      if (found) {
        emitMessageDeleted(found.conversationId, id);
      }

      res.status(200).json(updated);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || 'Failed to delete message' });
    }
  }

  async markRead(req: Request, res: Response) {
    try {
      const conversationId = Array.isArray(req.params.conversationId)
        ? req.params.conversationId[0]
        : req.params.conversationId;
      const result = await messagesService.markRead(conversationId, req.user!.id);

      emitMessagesRead(conversationId, req.user!.id);

      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  }
}

export const messagesController = new MessagesController();
