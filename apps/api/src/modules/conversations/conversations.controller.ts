import { Request, Response } from 'express';
import { conversationsService } from './conversations.service.js';

export class ConversationsController {
  async listConversations(req: Request, res: Response) {
    try {
      const list = await conversationsService.listConversations(req.user!.id);
      res.status(200).json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list conversations' });
    }
  }

  async getOrCreateDirect(req: Request, res: Response) {
    try {
      const { targetUserId } = req.body || {};
      const conv = await conversationsService.getOrCreateDirectConversation(req.user!.id, targetUserId);
      res.status(200).json(conv);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || 'Failed to start conversation' });
    }
  }

  async getConversation(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const conv = await conversationsService.getConversationDetails(id, req.user!.id);
      res.status(200).json(conv);
    } catch (err: any) {
      res.status(err.status || 404).json({ error: err.message || 'Failed to fetch conversation' });
    }
  }

  async updateSettings(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await conversationsService.updateParticipantSettings(id, req.user!.id, req.body || {});
      res.status(200).json(updated);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || 'Failed to update conversation settings' });
    }
  }
}

export const conversationsController = new ConversationsController();
