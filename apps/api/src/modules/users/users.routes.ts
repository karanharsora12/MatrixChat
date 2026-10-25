import { Router } from 'express';
import { usersController } from './users.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/me', (req, res) => usersController.getMe(req, res));
usersRouter.patch('/me', (req, res) => usersController.updateMe(req, res));
usersRouter.patch('/me/privacy', (req, res) => usersController.updatePrivacy(req, res));
usersRouter.get('/:id', (req, res) => usersController.getPublicProfile(req, res));
