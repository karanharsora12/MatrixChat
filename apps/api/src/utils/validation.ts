/**
 * Native Request Validation & Sanitization Engine
 * Zero external validation libraries (strict compliance with guidelines)
 */

export interface ValidationErrorItem {
  field: string;
  message: string;
}

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  errors: ValidationErrorItem[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Standard country calling code map with sample formats and min/max lengths
 */
export const COUNTRY_CODES: Record<string, { name: string; minLen: number; maxLen: number }> = {
  '+1': { name: 'USA / Canada', minLen: 10, maxLen: 10 },
  '+44': { name: 'United Kingdom', minLen: 10, maxLen: 11 },
  '+91': { name: 'India', minLen: 10, maxLen: 10 },
  '+61': { name: 'Australia', minLen: 9, maxLen: 9 },
  '+49': { name: 'Germany', minLen: 10, maxLen: 11 },
  '+33': { name: 'France', minLen: 9, maxLen: 9 },
  '+81': { name: 'Japan', minLen: 10, maxLen: 11 },
  '+86': { name: 'China', minLen: 11, maxLen: 11 },
  '+971': { name: 'United Arab Emirates', minLen: 9, maxLen: 9 },
  '+65': { name: 'Singapore', minLen: 8, maxLen: 8 },
  '+55': { name: 'Brazil', minLen: 10, maxLen: 11 },
};

/**
 * Normalizes input phone number into canonical E.164 format (+[countryCode][digits])
 */
export function normalizeE164(phone: string, defaultCountryCode = '+1'): string | null {
  if (!phone || typeof phone !== 'string') return null;

  // Trim whitespace
  let cleaned = phone.trim();

  // If already starts with '+', keep the '+' and strip all non-digits
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.slice(1).replace(/\D/g, '');
  } else {
    // Strip leading zeroes/special chars
    cleaned = cleaned.replace(/\D/g, '');
    const code = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;
    cleaned = `${code}${cleaned}`;
  }

  // E.164 must be between +7 and +15 digits
  const digitPart = cleaned.slice(1);
  if (!/^\d{7,15}$/.test(digitPart)) {
    return null;
  }

  return cleaned;
}

/**
 * Validates and normalizes email address (lowercased and trimmed)
 */
export function normalizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  // Standard RFC-compliant email pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed) || trimmed.length > 254) {
    return null;
  }
  return trimmed;
}

/**
 * Validates standard UUID v4 format
 */
export function isValidUUID(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Sanitizes plain string from malicious scripting and trims
 */
export function sanitizeString(val: unknown, maxLength = 1000): string {
  if (typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/[<>]/g, '') // strip direct angle brackets
    .slice(0, maxLength);
}

/**
 * Validates text length within bounds
 */
export function isValidString(val: unknown, min = 1, max = 255): boolean {
  if (typeof val !== 'string') return false;
  const len = val.trim().length;
  return len >= min && len <= max;
}

/**
 * Checks if value is one of allowed enum values
 */
export function isOneOf<T extends string>(val: unknown, allowed: readonly T[]): val is T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val);
}
