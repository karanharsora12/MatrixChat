import { db } from '../../db/index.js';
import { users, userPrivacySettings, sessions, otpChallenges } from '../../db/schema.js';
import { eq, and, desc, gt } from 'drizzle-orm';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  generateSessionToken,
  hashSessionToken,
} from '../../utils/crypto.js';
import {
  generateTotpSecret,
  generateTotpUri,
  generateQrCodeDataUrl,
  verifyTotp,
} from '../../utils/totp.js';
import { normalizeEmail } from '../../utils/validation.js';
import { getEmailProvider } from './email/index.js';

const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const SESSION_EXPIRY_DAYS = 30;

export interface RequestOtpParams {
  email?: string;
  identifier?: string;
  ipAddress?: string;
}

export interface VerifyOtpParams {
  email?: string;
  identifier?: string;
  otp: string;
  userAgent?: string;
  ipAddress?: string;
}

export class AuthService {
  private emailProvider = getEmailProvider();

  /**
   * Request OTP verification code for a given email address
   */
  async requestOtp(params: RequestOtpParams) {
    const { ipAddress = '' } = params;
    const rawEmail = params.email || params.identifier || '';
    const normalizedEmail = normalizeEmail(rawEmail);

    if (!normalizedEmail) {
      throw { status: 400, message: 'Please enter a valid email address.' };
    }

    // Check for active cooldown on recent unexpired challenge
    const [recentChallenge] = await db
      .select()
      .from(otpChallenges)
      .where(
        and(
          eq(otpChallenges.identifier, normalizedEmail),
          eq(otpChallenges.isConsumed, false),
          gt(otpChallenges.expiresAt, new Date())
        )
      )
      .orderBy(desc(otpChallenges.createdAt))
      .limit(1);

    if (recentChallenge) {
      const now = new Date();
      if (now < recentChallenge.resendAvailableAt) {
        const remainingSeconds = Math.ceil(
          (recentChallenge.resendAvailableAt.getTime() - now.getTime()) / 1000
        );
        throw {
          status: 429,
          message: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
          retryAfter: remainingSeconds,
        };
      }
    }

    // Generate fresh 6-digit OTP
    const otp = generateOtp();
    const otpHash = hashOtp(normalizedEmail, otp);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_SECONDS * 1000);

    // Persist OTP challenge
    await db.insert(otpChallenges).values({
      identifier: normalizedEmail,
      phoneNumber: null,
      type: 'email',
      otpHash,
      attempts: 0,
      expiresAt,
      resendAvailableAt,
      isConsumed: false,
      ipAddress,
    });

    const isDev = process.env.NODE_ENV !== 'production';

    // Dispatch via configured Email Provider (SMTP / Nodemailer)
    const emailResult = await this.emailProvider.sendOtp(normalizedEmail, otp);
    if (!emailResult.success) {
      console.error('[Email Dispatch Failed]', emailResult.error);
      throw {
        status: 502,
        message: emailResult.error || 'Unable to deliver verification email at this time. Please check SMTP configuration.',
      };
    }

    return {
      success: true,
      message: 'Verification code sent to your email address.',
      identifier: normalizedEmail,
      email: normalizedEmail,
      type: 'email',
      resendAfter: RESEND_COOLDOWN_SECONDS,
      isDev,
      devCode: isDev ? otp : undefined,
    };
  }

  /**
   * Verify OTP and initiate authenticated user session
   */
  async verifyOtp(params: VerifyOtpParams) {
    const { userAgent = '', ipAddress = '' } = params;
    const enteredOtp = (params.otp || '').trim();

    if (!enteredOtp || !/^\d{6}$/.test(enteredOtp)) {
      throw { status: 400, message: 'Please enter all 6 numeric digits of your verification code.' };
    }

    const rawEmail = params.email || params.identifier || '';
    const normalizedEmail = normalizeEmail(rawEmail);

    if (!normalizedEmail) {
      throw { status: 400, message: 'Invalid email address.' };
    }

    // Retrieve active challenge
    const [challenge] = await db
      .select()
      .from(otpChallenges)
      .where(
        and(
          eq(otpChallenges.identifier, normalizedEmail),
          eq(otpChallenges.isConsumed, false),
          gt(otpChallenges.expiresAt, new Date())
        )
      )
      .orderBy(desc(otpChallenges.createdAt))
      .limit(1);

    if (!challenge) {
      throw { status: 400, message: 'Verification code has expired or was not requested.' };
    }

    if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw { status: 429, message: 'Maximum verification attempts exceeded. Please request a new code.' };
    }

    // Validate OTP hash
    const isValid = verifyOtpHash(challenge.otpHash, normalizedEmail, enteredOtp);

    if (!isValid) {
      await db
        .update(otpChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(otpChallenges.id, challenge.id));

      const attemptsRemaining = MAX_VERIFY_ATTEMPTS - (challenge.attempts + 1);
      throw {
        status: 400,
        message: `Invalid verification code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
      };
    }

    // Mark challenge as consumed
    await db
      .update(otpChallenges)
      .set({ isConsumed: true })
      .where(eq(otpChallenges.id, challenge.id));

    // Find or create user by email
    let user;
    let isNewUser = false;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      user = existingUser;
    } else {
      isNewUser = true;
      const prefix = normalizedEmail.split('@')[0];
      const defaultDisplayName = prefix
        ? prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/[._-]/g, ' ')
        : 'MatrixChat User';

      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          phoneNumber: null,
          phoneCountryCode: null,
          displayName: defaultDisplayName,
          about: 'Hey there! I am using MatrixChat.',
          isOnline: true,
          lastSeenAt: new Date(),
        })
        .returning();

      user = newUser;

      // Default privacy settings
      await db.insert(userPrivacySettings).values({
        userId: user.id,
        lastSeenVisibility: 'everyone',
        onlineVisibility: 'everyone',
        avatarVisibility: 'everyone',
        aboutVisibility: 'everyone',
        readReceiptsEnabled: true,
      });
    }

    // Create session
    const rawSessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawSessionToken);
    const sessionExpiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await db
      .insert(sessions)
      .values({
        userId: user.id,
        tokenHash,
        ipAddress,
        userAgent,
        expiresAt: sessionExpiresAt,
      })
      .returning();

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        about: user.about,
        isOnline: user.isOnline,
        lastSeenAt: user.lastSeenAt,
        totpEnabled: Boolean(user.totpEnabled),
      },
      rawSessionToken,
      sessionExpiresAt,
      isNewUser,
    };
  }

  /**
   * Check authentication methods available for an email address (e.g. if TOTP is active)
   */
  async checkAuthMethods(email: string) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return { exists: false, hasTotp: false };
    }

    const [user] = await db
      .select({ id: users.id, totpEnabled: users.totpEnabled })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    return {
      exists: Boolean(user),
      hasTotp: Boolean(user?.totpEnabled),
    };
  }

  /**
   * Generate a new TOTP secret & QR code for 2FA setup
   */
  async setupTotp(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.email) {
      throw { status: 404, message: 'User not found or email missing.' };
    }

    const secret = generateTotpSecret(20);
    const otpauthUri = generateTotpUri(user.email, secret, 'MatrixChat');
    const qrCodeUrl = await generateQrCodeDataUrl(otpauthUri);

    // Save temporary secret until confirmed by the user
    await db
      .update(users)
      .set({ totpTempSecret: secret })
      .where(eq(users.id, userId));

    return {
      secret,
      qrCodeUrl,
      otpauthUri,
      email: user.email,
    };
  }

  /**
   * Verify entered 6-digit code and activate TOTP 2FA
   */
  async verifyAndEnableTotp(userId: string, code: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw { status: 404, message: 'User not found.' };
    }

    if (!user.totpTempSecret) {
      throw { status: 400, message: 'No 2FA setup in progress. Please start setup again.' };
    }

    const isValid = verifyTotp(code, user.totpTempSecret);
    if (!isValid) {
      throw { status: 400, message: 'Invalid 6-digit authenticator code. Check your app and try again.' };
    }

    // Activate TOTP
    await db
      .update(users)
      .set({
        totpSecret: user.totpTempSecret,
        totpEnabled: true,
        totpTempSecret: null,
      })
      .where(eq(users.id, userId));

    return {
      success: true,
      message: 'Two-Factor Authenticator enabled successfully.',
    };
  }

  /**
   * Disable TOTP 2FA
   */
  async disableTotp(userId: string) {
    await db
      .update(users)
      .set({
        totpSecret: null,
        totpEnabled: false,
        totpTempSecret: null,
      })
      .where(eq(users.id, userId));

    return {
      success: true,
      message: 'Two-Factor Authenticator has been disabled.',
    };
  }

  /**
   * Verify TOTP code directly during login
   */
  async verifyTotpLogin(params: {
    email: string;
    code: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const { code, userAgent = '', ipAddress = '' } = params;
    const normalizedEmail = normalizeEmail(params.email);

    if (!normalizedEmail) {
      throw { status: 400, message: 'Please enter a valid email address.' };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw {
        status: 400,
        message: 'Authenticator app is not enabled for this account. Please sign in with an email code.',
      };
    }

    const isValid = verifyTotp(code, user.totpSecret);
    if (!isValid) {
      throw {
        status: 400,
        message: 'Invalid 6-digit authenticator code. Check your Google or Microsoft Authenticator app.',
      };
    }

    // Create session
    const rawSessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawSessionToken);
    const sessionExpiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      userId: user.id,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt: sessionExpiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        about: user.about,
        isOnline: user.isOnline,
        lastSeenAt: user.lastSeenAt,
        totpEnabled: true,
      },
      rawSessionToken,
      sessionExpiresAt,
    };
  }

  /**
   * Log out session
   */
  async logout(rawToken: string) {
    if (!rawToken) return;
    const tokenHash = hashSessionToken(rawToken);
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
}

export const authService = new AuthService();
