import { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { SESSION_COOKIE_NAME } from '../../middleware/auth.js';

export class AuthController {
  async requestOtp(req: Request, res: Response) {
    try {
      const { email, identifier } = req.body || {};
      const targetEmail = email || identifier;

      if (!targetEmail) {
        res.status(400).json({ error: 'Email address is required.' });
        return;
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const result = await authService.requestOtp({
        email: targetEmail,
        ipAddress: clientIp,
      });

      res.status(200).json(result);
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        error: err.message || 'An error occurred while requesting verification code.',
        retryAfter: err.retryAfter,
      });
    }
  }

  async verifyOtp(req: Request, res: Response) {
    try {
      const { email, identifier, otp } = req.body || {};
      const targetEmail = email || identifier;

      if (!targetEmail || !otp) {
        res.status(400).json({ error: 'Email address and 6-digit OTP code are required.' });
        return;
      }

      const userAgent = req.headers['user-agent'] || '';
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

      const { user, rawSessionToken, sessionExpiresAt, isNewUser } = await authService.verifyOtp({
        email: targetEmail,
        otp,
        userAgent,
        ipAddress: clientIp,
      });

      // Set secure HTTP-only cookie
      res.cookie(SESSION_COOKIE_NAME, rawSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: sessionExpiresAt,
        path: '/',
      });

      res.status(200).json({
        success: true,
        user,
        isNewUser,
        token: rawSessionToken,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        error: err.message || 'Verification failed.',
      });
    }
  }

  async getSession(req: Request, res: Response) {
    res.status(200).json({
      authenticated: true,
      user: req.user,
    });
  }

  async logout(req: Request, res: Response) {
    try {
      const rawToken = req.cookies?.[SESSION_COOKIE_NAME] || req.headers['x-session-token'];
      if (rawToken && typeof rawToken === 'string') {
        await authService.logout(rawToken);
      }

      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to complete logout.' });
    }
  }

  async checkAuthMethods(req: Request, res: Response) {
    try {
      const email = (req.query.email as string) || req.body?.email || '';
      const result = await authService.checkAuthMethods(email);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to check authentication methods.' });
    }
  }

  async verifyTotp(req: Request, res: Response) {
    try {
      const { email, code } = req.body || {};
      if (!email || !code) {
        res.status(400).json({ error: 'Email and 6-digit authenticator code are required.' });
        return;
      }

      const userAgent = req.headers['user-agent'] || '';
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

      const { user, rawSessionToken, sessionExpiresAt } = await authService.verifyTotpLogin({
        email,
        code,
        userAgent,
        ipAddress: clientIp,
      });

      res.cookie(SESSION_COOKIE_NAME, rawSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: sessionExpiresAt,
        path: '/',
      });

      res.status(200).json({
        success: true,
        user,
        token: rawSessionToken,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        error: err.message || 'Authenticator verification failed.',
      });
    }
  }

  async setupTotp(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      const result = await authService.setupTotp(userId);
      res.status(200).json(result);
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        error: err.message || 'Failed to initialize Authenticator QR setup.',
      });
    }
  }

  async verifyTotpSetup(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { code } = req.body || {};

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      if (!code) {
        res.status(400).json({ error: '6-digit authenticator code is required.' });
        return;
      }

      const result = await authService.verifyAndEnableTotp(userId, code);
      res.status(200).json(result);
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        error: err.message || 'Failed to verify and activate Authenticator.',
      });
    }
  }

  async disableTotp(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      const result = await authService.disableTotp(userId);
      res.status(200).json(result);
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        error: err.message || 'Failed to disable Authenticator.',
      });
    }
  }
}

export const authController = new AuthController();
