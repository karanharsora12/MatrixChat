import { Router } from 'express';
import { authController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/request-otp', (req, res) => authController.requestOtp(req, res));
authRouter.post('/verify-otp', (req, res) => authController.verifyOtp(req, res));
authRouter.get('/check-methods', (req, res) => authController.checkAuthMethods(req, res));
authRouter.post('/verify-totp', (req, res) => authController.verifyTotp(req, res));
authRouter.get('/session', requireAuth, (req, res) => authController.getSession(req, res));
authRouter.post('/logout', requireAuth, (req, res) => authController.logout(req, res));

// Two-Factor Authentication (TOTP / Authenticator App)
authRouter.post('/2fa/setup', requireAuth, (req, res) => authController.setupTotp(req, res));
authRouter.post('/2fa/verify', requireAuth, (req, res) => authController.verifyTotpSetup(req, res));
authRouter.post('/2fa/disable', requireAuth, (req, res) => authController.disableTotp(req, res));
