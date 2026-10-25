import { Router } from 'express';
import { contactsController } from './contacts.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.post('/search', (req, res) => contactsController.searchByPhone(req, res));
contactsRouter.get('/', (req, res) => contactsController.listContacts(req, res));
contactsRouter.post('/', (req, res) => contactsController.saveContact(req, res));
contactsRouter.delete('/:contactUserId', (req, res) => contactsController.deleteContact(req, res));
contactsRouter.post('/block', (req, res) => contactsController.blockUser(req, res));
contactsRouter.post('/unblock', (req, res) => contactsController.unblockUser(req, res));
contactsRouter.get('/blocked', (req, res) => contactsController.listBlockedUsers(req, res));
