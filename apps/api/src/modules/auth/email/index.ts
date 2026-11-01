import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
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
 * Standard Production SMTP Email Provider using Nodemailer.
 * Compatible with Gmail (App Passwords), AWS SES, Brevo, SendGrid, Mailgun, Mailtrap, and custom SMTP servers.
 */
export class SmtpEmailProvider implements IEmailProvider {
  readonly name = 'SmtpEmailProvider';

  private transporter: Transporter;
  private fromAddress: string;

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const service = process.env.SMTP_SERVICE; // Optional: e.g. 'gmail'

    this.fromAddress =
      process.env.EMAIL_FROM ||
      (user ? `"MatrixChat" <${user}>` : '"MatrixChat" <no-reply@matrixchat.local>');

    if (!user || !pass) {
      console.warn(
        '[SmtpEmailProvider] Warning: SMTP_USER or SMTP_PASS is missing in environment variables. Outbound emails will fail until credentials are provided.'
      );
    }

    const transportOptions: any = service
      ? {
          service,
          auth: { user, pass },
        }
      : {
          host,
          port,
          secure,
          auth: user && pass ? { user, pass } : undefined,
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
        };

    this.transporter = nodemailer.createTransport(transportOptions);
  }

  async sendOtp(email: string, otp: string): Promise<SendEmailResult> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your MatrixChat Verification Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b141a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e9edef;
    }
    .container {
      max-width: 520px;
      margin: 40px auto;
      background-color: #111b21;
      border: 1px solid #222e35;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .header {
      background: linear-gradient(135deg, #00a884 0%, #008069 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .sub-header {
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
      margin-top: 6px;
      font-weight: 500;
    }
    .content {
      padding: 36px 32px;
      text-align: center;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      color: #e9edef;
      margin: 0 0 12px 0;
    }
    .description {
      font-size: 14px;
      line-height: 1.6;
      color: #8696a0;
      margin: 0 0 28px 0;
    }
    .otp-card {
      background-color: #202c33;
      border: 1px dashed #00a884;
      border-radius: 12px;
      padding: 20px;
      margin: 0 auto 28px auto;
      display: inline-block;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #00a884;
      margin: 0;
    }
    .badge {
      display: inline-block;
      margin-top: 10px;
      font-size: 12px;
      color: #ffd279;
      background-color: rgba(255, 210, 121, 0.1);
      padding: 4px 10px;
      border-radius: 9999px;
    }
    .security-notice {
      background-color: rgba(32, 44, 51, 0.6);
      border-radius: 8px;
      padding: 16px;
      text-align: left;
      font-size: 12px;
      color: #8696a0;
      line-height: 1.6;
      border-left: 3px solid #00a884;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 11px;
      color: #667781;
      border-top: 1px solid #202c33;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo-text">MatrixChat</h1>
      <div class="sub-header">Secure End-to-End Real-Time Communications</div>
    </div>
    <div class="content">
      <h2 class="title">Verification Code</h2>
      <p class="description">
        You requested a verification code to sign in or register on MatrixChat. Use the code below to complete verification:
      </p>

      <div class="otp-card">
        <div class="otp-code">${otp}</div>
        <div class="badge">⏱ Valid for 5 minutes</div>
      </div>

      <div class="security-notice">
        <strong>Security Tip:</strong> Never share this code with anyone. MatrixChat staff will never ask for your code. If you did not initiate this request, you can safely disregard this email.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} MatrixChat. All rights reserved.
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = [
      `MatrixChat Verification Code`,
      ``,
      `Your verification code is: ${otp}`,
      ``,
      `This code is valid for 5 minutes. Never share this code with anyone.`,
      `If you did not request this verification code, please ignore this message.`,
    ].join('\n');

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: `Your MatrixChat verification code: ${otp}`,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[SmtpEmailProvider] OTP email dispatched to ${email} (Message ID: ${info.messageId})`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error('[SmtpEmailProvider] Failed to dispatch email:', err);

      let errorMessage = err.message || 'SMTP transport failure';
      if (err.code === 'EAUTH') {
        errorMessage =
          'SMTP authentication failed. Verify SMTP_USER and SMTP_PASS (for Gmail, ensure you are using a 16-character App Password).';
      } else if (err.code === 'ESOCKET' || err.code === 'ETIMEDOUT') {
        errorMessage = 'Could not connect to SMTP server. Check SMTP_HOST and SMTP_PORT.';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

/**
 * Development-only Mock Email Provider for offline testing.
 */
export class DevMockEmailProvider implements IEmailProvider {
  readonly name = 'DevMockEmailProvider';

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[FATAL CONFIGURATION ERROR] DevMockEmailProvider cannot be used in production environment! Configure a real SMTP provider.'
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
      `Hint: Configure SMTP_USER and SMTP_PASS in .env for real email delivery.`,
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
 * Factory to retrieve the configured Email provider.
 * Uses SmtpEmailProvider by default or when configured, and falls back to DevMockEmailProvider
 * only in non-production environments when credentials are not yet configured.
 */
export function getEmailProvider(): IEmailProvider {
  const providerType = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  const hasSmtpConfig = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

  if (process.env.NODE_ENV === 'production') {
    if (providerType === 'mock') {
      throw new Error(
        '[CRITICAL] Production deployment cannot have EMAIL_PROVIDER=mock. Provide valid SMTP credentials.'
      );
    }
    return new SmtpEmailProvider();
  }

  // Explicit mock request
  if (providerType === 'mock') {
    return new DevMockEmailProvider();
  }

  // If SMTP is explicitly configured or SMTP credentials are present, use real SMTP
  if (providerType === 'smtp' || hasSmtpConfig) {
    return new SmtpEmailProvider();
  }

  // If in development and no credentials provided yet, warn and use mock until configured
  console.log(
    '[Email Service] No SMTP credentials configured. Falling back to DevMockEmailProvider. Set EMAIL_PROVIDER=smtp, SMTP_USER, and SMTP_PASS in .env to deliver real emails.'
  );
  return new DevMockEmailProvider();
}
