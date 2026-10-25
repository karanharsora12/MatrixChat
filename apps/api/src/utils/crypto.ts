import crypto from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const SECRET = process.env.SESSION_SECRET || 'matrix_chat_default_secure_secret_pepper_12345';

/**
 * Generates a 6-digit numeric OTP code using cryptographically secure PRNG
 */
export function generateOtp(): string {
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
}

/**
 * Hashes an OTP with HMAC-SHA256 and appends phone number as salt to prevent rainbow tables
 */
export function hashOtp(phoneNumber: string, otp: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`${phoneNumber}:${otp}`)
    .digest('hex');
}

/**
 * Timing-safe comparison of OTP hashes to prevent timing attacks
 */
export function verifyOtpHash(storedHash: string, phoneNumber: string, candidateOtp: string): boolean {
  const candidateHash = hashOtp(phoneNumber, candidateOtp);
  if (storedHash.length !== candidateHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(candidateHash, 'hex'));
}

/**
 * Generates an opaque high-entropy random session token (32 bytes hex)
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a session token for storage in the database (SHA-256)
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
