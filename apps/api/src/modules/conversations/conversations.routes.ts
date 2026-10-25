import { Router } from 'express';
import { conversationsController } from './conversations.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

conversationsRouter.get('/', (req, res) => conversationsController.listConversations(req, res));
conversationsRouter.post('/', (req, res) => conversationsController.getOrCreateDirect(req, res));
conversationsRouter.get('/:id', (req, res) => conversationsController.getConversation(req, res));
conversationsRouter.patch('/:id/settings', (req, res) => conversationsController.updateSettings(req, res));
