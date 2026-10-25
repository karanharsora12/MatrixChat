import { db } from '../../db/index.js';
import { users, userPrivacySettings, sessions, otpChallenges } from '../../db/schema.js';
import { eq, and, desc, gt, or } from 'drizzle-orm';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  generateSessionToken,
  hashSessionToken,
} from '../../utils/crypto.js';
import { normalizeE164, normalizeEmail } from '../../utils/validation.js';
import { getSmsProvider } from './sms/index.js';
import { getEmailProvider } from './email/index.js';

const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const SESSION_EXPIRY_DAYS = 30;

export interface RequestOtpParams {
  type?: 'phone' | 'email';
  phoneNumber?: string;
  countryCode?: string;
  email?: string;
  identifier?: string;
  ipAddress?: string;
}

export interface VerifyOtpParams {
  identifier?: string;
  phoneNumber?: string;
  email?: string;
  otp: string;
  userAgent?: string;
  ipAddress?: string;
}

export class AuthService {
  private smsProvider = getSmsProvider();
  private emailProvider = getEmailProvider();

  /**
   * Request OTP code for a given mobile number or email address
   */
  async requestOtp(params: RequestOtpParams) {
    const { countryCode = '+1', ipAddress = '' } = params;
    let authType: 'phone' | 'email' = params.type || (params.email ? 'email' : 'phone');
    let normalizedIdentifier: string | null = null;

    if (params.email || authType === 'email') {
      const emailInput = params.email || params.identifier || '';
      normalizedIdentifier = normalizeEmail(emailInput);
      if (!normalizedIdentifier) {
        throw { status: 400, message: 'Invalid email address format.' };
      }
      authType = 'email';
    } else {
      const phoneInput = params.phoneNumber || params.identifier || '';
      normalizedIdentifier = normalizeE164(phoneInput, countryCode);
      if (!normalizedIdentifier) {
        throw { status: 400, message: 'Invalid international phone number format.' };
      }
      authType = 'phone';
    }

    // Check for recent unexpired challenge cooldown
    const [recentChallenge] = await db
      .select()
      .from(otpChallenges)
      .where(
        and(
          or(
            eq(otpChallenges.identifier, normalizedIdentifier),
            eq(otpChallenges.phoneNumber, normalizedIdentifier)
          ),
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

    // Generate fresh OTP
    const otp = generateOtp();
    const otpHash = hashOtp(normalizedIdentifier, otp);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_SECONDS * 1000);

    // Persist challenge
    await db.insert(otpChallenges).values({
      identifier: normalizedIdentifier,
      phoneNumber: authType === 'phone' ? normalizedIdentifier : null,
      type: authType,
      otpHash,
      attempts: 0,
      expiresAt,
      resendAvailableAt,
      isConsumed: false,
      ipAddress,
    });

    const isDev = process.env.NODE_ENV !== 'production';

    // Dispatch via configured adapter
    if (authType === 'email') {
      const emailResult = await this.emailProvider.sendOtp(normalizedIdentifier, otp);
      if (!emailResult.success) {
        console.error('[Email Dispatch Failed]', emailResult.error);
        throw { status: 502, message: 'Unable to deliver verification email at this time. Please try again.' };
      }

      return {
        success: true,
        message: 'Verification code sent to your email.',
        identifier: normalizedIdentifier,
        email: normalizedIdentifier,
        type: 'email',
        resendAfter: RESEND_COOLDOWN_SECONDS,
        isDev,
        devCode: isDev ? otp : undefined,
      };
    } else {
      const smsResult = await this.smsProvider.sendOtp(normalizedIdentifier, otp);
      if (!smsResult.success) {
        console.error('[SMS Dispatch Failed]', smsResult.error);
        throw { status: 502, message: 'Unable to deliver verification SMS at this time. Please try again.' };
      }

      return {
        success: true,
        message: 'Verification code sent to your phone.',
        identifier: normalizedIdentifier,
        phoneNumber: normalizedIdentifier,
        type: 'phone',
        resendAfter: RESEND_COOLDOWN_SECONDS,
        isDev,
        devCode: isDev ? otp : undefined,
      };
    }
  }

  /**
   * Verify OTP and initiate user session
   */
  async verifyOtp(params: VerifyOtpParams) {
    const { enteredOtp, userAgent = '', ipAddress = '' } = {
      ...params,
      enteredOtp: params.otp,
    };

    if (!enteredOtp || !/^\d{6}$/.test(enteredOtp.trim())) {
      throw { status: 400, message: 'OTP must be a 6-digit numeric code.' };
    }

    const rawInput = params.email || params.phoneNumber || params.identifier || '';
    let targetIdentifier: string | null = null;
    let authType: 'phone' | 'email' = 'phone';

    if (rawInput.includes('@') || params.email) {
      targetIdentifier = normalizeEmail(rawInput);
      authType = 'email';
      if (!targetIdentifier) {
        throw { status: 400, message: 'Invalid email address format.' };
      }
    } else {
      targetIdentifier = normalizeE164(rawInput);
      authType = 'phone';
      if (!targetIdentifier) {
        throw { status: 400, message: 'Invalid phone number format.' };
      }
    }

    // Retrieve active challenge
    const [challenge] = await db
      .select()
      .from(otpChallenges)
      .where(
        and(
          or(
            eq(otpChallenges.identifier, targetIdentifier),
            eq(otpChallenges.phoneNumber, targetIdentifier)
          ),
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
    const isValid = verifyOtpHash(challenge.otpHash, targetIdentifier, enteredOtp.trim());

    if (!isValid) {
      // Increment attempts
      await db
        .update(otpChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(otpChallenges.id, challenge.id));

      const attemptsRemaining = MAX_VERIFY_ATTEMPTS - (challenge.attempts + 1);
      throw {
        status: 400,
        message: `Invalid verification code. ${attemptsRemaining} attempts remaining.`,
      };
    }

    // Mark challenge as consumed
    await db
      .update(otpChallenges)
      .set({ isConsumed: true })
      .where(eq(otpChallenges.id, challenge.id));

    // Find or create user
    let user;
    let isNewUser = false;

    if (authType === 'email') {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, targetIdentifier))
        .limit(1);

      if (existingUser) {
        user = existingUser;
      } else {
        isNewUser = true;
        const prefix = targetIdentifier.split('@')[0];
        const defaultDisplayName = prefix
          ? prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/[._-]/g, ' ')
          : null;

        const [newUser] = await db
          .insert(users)
          .values({
            email: targetIdentifier,
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
    } else {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, targetIdentifier))
        .limit(1);

      if (existingUser) {
        user = existingUser;
      } else {
        isNewUser = true;
        const countryCode = targetIdentifier.startsWith('+44')
          ? '+44'
          : targetIdentifier.startsWith('+91')
          ? '+91'
          : '+1';

        const [newUser] = await db
          .insert(users)
          .values({
            phoneNumber: targetIdentifier,
            phoneCountryCode: countryCode,
            email: null,
            displayName: null,
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
        phoneNumber: user.phoneNumber,
        phoneCountryCode: user.phoneCountryCode,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        about: user.about,
        isOnline: user.isOnline,
        lastSeenAt: user.lastSeenAt,
      },
      rawSessionToken,
      sessionExpiresAt,
      isNewUser,
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
