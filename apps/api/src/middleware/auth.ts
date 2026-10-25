import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { sessions, users, userPrivacySettings } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { hashSessionToken } from '../utils/crypto.js';

export interface AuthenticatedUser {
  id: string;
  phoneNumber: string | null;
  phoneCountryCode: string | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  about: string | null;
  isOnline: boolean;
  lastSeenAt: Date | null;
}

export interface AuthenticatedSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      session?: AuthenticatedSession;
    }
  }
}

export const SESSION_COOKIE_NAME = 'matrix_session';

/**
 * Authentication middleware that verifies session token against DB
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME] || req.headers['x-session-token'];

    if (!rawToken || typeof rawToken !== 'string') {
      res.status(401).json({ error: 'Authentication required. No session token provided.' });
      return;
    }

    const tokenHash = hashSessionToken(rawToken);

    // Query active session
    const [foundSession] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (!foundSession) {
      // Clear invalid cookie
      res.clearCookie(SESSION_COOKIE_NAME);
      res.status(401).json({ error: 'Session expired or invalid.' });
      return;
    }

    // Fetch user details
    const [foundUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, foundSession.userId))
      .limit(1);

    if (!foundUser) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }

    // Touch session activity asynchronously
    db.update(sessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(sessions.id, foundSession.id))
      .catch((err) => console.error('[Touch Session Error]', err));

    req.user = {
      id: foundUser.id,
      phoneNumber: foundUser.phoneNumber,
      phoneCountryCode: foundUser.phoneCountryCode,
      email: foundUser.email,
      displayName: foundUser.displayName,
      avatarUrl: foundUser.avatarUrl,
      about: foundUser.about,
      isOnline: foundUser.isOnline,
      lastSeenAt: foundUser.lastSeenAt,
    };

    req.session = {
      id: foundSession.id,
      userId: foundSession.userId,
      expiresAt: foundSession.expiresAt,
    };

    next();
  } catch (err) {
    console.error('[Auth Middleware Error]', err);
    res.status(500).json({ error: 'Internal security error.' });
  }
}
