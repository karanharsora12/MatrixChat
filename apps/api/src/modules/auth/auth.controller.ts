import { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { SESSION_COOKIE_NAME } from '../../middleware/auth.js';

export class AuthController {
  async requestOtp(req: Request, res: Response) {
    try {
      const { phoneNumber, countryCode, email, identifier, type } = req.body || {};

      if (!phoneNumber && !email && !identifier) {
        res.status(400).json({ error: 'Email address or mobile number is required.' });
        return;
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const result = await authService.requestOtp({
        phoneNumber,
        countryCode: countryCode || '+1',
        email,
        identifier,
        type,
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
      const { phoneNumber, email, identifier, otp } = req.body || {};

      if ((!phoneNumber && !email && !identifier) || !otp) {
        res.status(400).json({ error: 'Target identifier and 6-digit OTP code are required.' });
        return;
      }

      const userAgent = req.headers['user-agent'] || '';
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

      const { user, rawSessionToken, sessionExpiresAt, isNewUser } = await authService.verifyOtp({
        phoneNumber,
        email,
        identifier,
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
        token: rawSessionToken, // Also return in body for flex clients
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        error: err.message || 'Verification failed.',
      });
    }
  }

  async getSession(req: Request, res: Response) {
    // Handled by requireAuth middleware
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
}

export const authController = new AuthController();
