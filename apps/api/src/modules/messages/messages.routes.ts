import { Router } from 'express';
import { messagesController } from './messages.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const messagesRouter = Router();

messagesRouter.use(requireAuth);

messagesRouter.get('/conversations/:conversationId/messages', (req, res) =>
  messagesController.getMessages(req, res)
);
messagesRouter.post('/conversations/:conversationId/messages', (req, res) =>
  messagesController.sendMessage(req, res)
);
messagesRouter.post('/conversations/:conversationId/read', (req, res) =>
  messagesController.markRead(req, res)
);
messagesRouter.delete('/messages/:id', (req, res) => messagesController.deleteMessage(req, res));
