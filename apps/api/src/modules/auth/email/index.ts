import * as dotenv from 'dotenv';
dotenv.config();

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IEmailProvider {
  readonly name: string;
  sendOtp(email: string, otp: string): Promise<SendEmailResult>;
}

/**
 * Development-only Mock Email Provider.
 * Strictest guard: cannot be instantiated in production when EMAIL_PROVIDER=mock.
 */
export class DevMockEmailProvider implements IEmailProvider {
  readonly name = 'DevMockEmailProvider';

  constructor() {
    if (process.env.NODE_ENV === 'production' && process.env.EMAIL_PROVIDER === 'mock') {
      throw new Error(
        '[FATAL CONFIGURATION ERROR] DevMockEmailProvider cannot be used in production environment! Configure a real email provider.'
      );
    }
  }

  async sendOtp(email: string, otp: string): Promise<SendEmailResult> {
    const banner = [
      '================================================================',
      `✉️  [MATRIXCHAT EMAIL DISPATCH - DEV MOCK]`,
      `To:   ${email}`,
      `Code: ${otp}`,
      `Note: Valid for 5 minutes. Enter this code in MatrixChat UI.`,
      '================================================================',
    ].join('\n');

    console.log('\n' + banner + '\n');

    return {
      success: true,
      messageId: `mock-email-${Date.now()}`,
    };
  }
}

/**
 * Factory to retrieve the configured Email provider
 */
export function getEmailProvider(): IEmailProvider {
  return new DevMockEmailProvider();
}
