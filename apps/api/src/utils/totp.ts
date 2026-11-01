import crypto from 'crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer to RFC 4648 Base32 string (without padding)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes an RFC 4648 Base32 string to a Buffer
 */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      continue; // Skip invalid characters
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically secure random Base32 secret (20 bytes / 160 bits)
 */
export function generateTotpSecret(numBytes = 20): string {
  const randomBytes = crypto.randomBytes(numBytes);
  return base32Encode(randomBytes);
}

/**
 * Generates the standardized otpauth:// URI recognized by Google Authenticator,
 * Microsoft Authenticator, Authy, Apple Passwords, etc.
 */
export function generateTotpUri(email: string, secret: string, issuer = 'MatrixChat'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a high-quality Data URL (base64 image/png) for the QR code
 */
export async function generateQrCodeDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
    color: {
      dark: '#111b21',
      light: '#ffffff',
    },
  });
}

/**
 * Generates a 6-digit TOTP token according to RFC 6238 / RFC 4226
 */
export function generateTotp(
  secret: string,
  timeStepOffset = 0,
  period = 30,
  digits = 6
): string {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / period) + timeStepOffset;

  // Counter must be an 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binaryCode % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verifies a 6-digit TOTP token against the Base32 secret.
 * Allows a +/- 1 step window (30 seconds before/after) to account for clock skew.
 */
export function verifyTotp(
  token: string,
  secret: string,
  window = 1,
  period = 30,
  digits = 6
): boolean {
  if (!token || !secret) return false;

  const sanitizedToken = token.trim().replace(/\s/g, '');
  if (sanitizedToken.length !== digits || !/^\d+$/.test(sanitizedToken)) {
    return false;
  }

  for (let offset = -window; offset <= window; offset++) {
    const expected = generateTotp(secret, offset, period, digits);
    const expectedBuf = Buffer.from(expected);
    const enteredBuf = Buffer.from(sanitizedToken);

    if (
      expectedBuf.length === enteredBuf.length &&
      crypto.timingSafeEqual(expectedBuf, enteredBuf)
    ) {
      return true;
    }
  }

  return false;
}
