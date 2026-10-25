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
import { normalizeE164 } from '../../utils/validation.js';
import { getSmsProvider } from './sms/index.js';

const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const SESSION_EXPIRY_DAYS = 30;

export class AuthService {
  private smsProvider = getSmsProvider();

  /**
   * Request OTP code for a given mobile number
   */
  async requestOtp(phoneInput: string, countryCodeInput = '+1', ipAddress = '') {
    const normalizedPhone = normalizeE164(phoneInput, countryCodeInput);

    if (!normalizedPhone) {
      throw { status: 400, message: 'Invalid international phone number format.' };
    }

    // Check for recent unexpired challenge cooldown
    const [recentChallenge] = await db
      .select()
      .from(otpChallenges)
      .where(
        and(
          eq(otpChallenges.phoneNumber, normalizedPhone),
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
    const otpHash = hashOtp(normalizedPhone, otp);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_SECONDS * 1000);

    // Persist challenge
    await db.insert(otpChallenges).values({
      phoneNumber: normalizedPhone,
      otpHash,
      attempts: 0,
      expiresAt,
      resendAvailableAt,
      isConsumed: false,
      ipAddress,
    });

    // Send via configured adapter
    const smsResult = await this.smsProvider.sendOtp(normalizedPhone, otp);
    if (!smsResult.success) {
      console.error('[SMS Dispatch Failed]', smsResult.error);
      throw { status: 502, message: 'Unable to deliver verification SMS at this time. Please try again.' };
    }

    return {
      success: true,
      message: 'Verification code sent successfully.',
      phoneNumber: normalizedPhone,
      resendAfter: RESEND_COOLDOWN_SECONDS,
      // For development mock mode convenience only:
      isDev: process.env.NODE_ENV !== 'production' && this.smsProvider.name === 'DevMockSmsProvider',
    };
  }

  /**
   * Verify OTP and initiate user session
   */
  async verifyOtp(phoneNumber: string, enteredOtp: string, userAgent = '', ipAddress = '') {
    const normalizedPhone = normalizeE164(phoneNumber);
    if (!normalizedPhone) {
      throw { status: 400, message: 'Invalid phone number format.' };
    }

    if (!enteredOtp || !/^\d{6}$/.test(enteredOtp.trim())) {
      throw { status: 400, message: 'OTP must be a 6-digit numeric code.' };
    }

    // Retrieve active challenge
    const [challenge] = await db
      .select()
      .from(otpChallenges)
      .where(
        and(
          eq(otpChallenges.phoneNumber, normalizedPhone),
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
    const isValid = verifyOtpHash(challenge.otpHash, normalizedPhone, enteredOtp.trim());

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
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, normalizedPhone))
      .limit(1);

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const countryCode = normalizedPhone.startsWith('+44')
        ? '+44'
        : normalizedPhone.startsWith('+91')
        ? '+91'
        : '+1';

      const [newUser] = await db
        .insert(users)
        .values({
          phoneNumber: normalizedPhone,
          phoneCountryCode: countryCode,
          displayName: null,
          about: 'Hey there! I am using MatrixChat.',
          isOnline: true,
          lastSeenAt: new Date(),
        })
        .returning();

      user = newUser;

      // Create default privacy settings
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

    const [session] = await db
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
