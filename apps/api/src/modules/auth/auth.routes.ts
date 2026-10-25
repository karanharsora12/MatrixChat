import { Router } from 'express';
import { authController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/request-otp', (req, res) => authController.requestOtp(req, res));
authRouter.post('/verify-otp', (req, res) => authController.verifyOtp(req, res));
authRouter.get('/session', requireAuth, (req, res) => authController.getSession(req, res));
authRouter.post('/logout', requireAuth, (req, res) => authController.logout(req, res));
