import * as dotenv from 'dotenv';
dotenv.config();

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ISmsProvider {
  readonly name: string;
  sendOtp(phoneNumber: string, otp: string): Promise<SendSmsResult>;
}

/**
 * Development-only Mock SMS Provider.
 * Strictest guard: cannot be invoked or instantiated in production.
 */
export class DevMockSmsProvider implements ISmsProvider {
  readonly name = 'DevMockSmsProvider';

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[FATAL CONFIGURATION ERROR] DevMockSmsProvider cannot be used in production environment! Configure a real SMS provider like Twilio.'
      );
    }
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<SendSmsResult> {
    const banner = [
      '================================================================',
      `📱 [MATRIXCHAT SMS DISPATCH - DEV MOCK]`,
      `To:   ${phoneNumber}`,
      `Code: ${otp}`,
      `Note: Valid for 5 minutes. Enter this code in MatrixChat UI.`,
      '================================================================',
    ].join('\n');

    console.log('\n' + banner + '\n');

    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
    };
  }
}

/**
 * Production Twilio SMS Provider using native HTTP fetch
 */
export class TwilioSmsProvider implements ISmsProvider {
  readonly name = 'TwilioSmsProvider';

  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.warn(
        '[TwilioSmsProvider] Twilio credentials not fully configured in environment. Outbound SMS might fail.'
      );
    }
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<SendSmsResult> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const body = new URLSearchParams({
        To: phoneNumber,
        From: this.fromNumber,
        Body: `Your MatrixChat verification code is: ${otp}. Do not share this code with anyone.`,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        console.error('[Twilio Error]', data);
        return {
          success: false,
          error: data.message || 'Failed to dispatch SMS through Twilio',
        };
      }

      return {
        success: true,
        messageId: data.sid,
      };
    } catch (err: any) {
      console.error('[Twilio Exception]', err);
      return {
        success: false,
        error: err.message || 'SMS network error',
      };
    }
  }
}

/**
 * Factory to retrieve the configured SMS provider
 */
export function getSmsProvider(): ISmsProvider {
  const providerType = (process.env.SMS_PROVIDER || 'mock').toLowerCase();

  if (process.env.NODE_ENV === 'production' && providerType === 'mock') {
    throw new Error(
      '[CRITICAL] Production deployment cannot have SMS_PROVIDER=mock. Provide a valid Twilio configuration.'
    );
  }

  if (providerType === 'twilio') {
    return new TwilioSmsProvider();
  }

  return new DevMockSmsProvider();
}
