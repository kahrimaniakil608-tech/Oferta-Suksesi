import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import Redis from 'ioredis';

@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private subscriber: Redis;
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.zeptomail.eu'),
      port: this.config.get<number>('SMTP_PORT', 587),
      auth: {
        user: this.config.get<string>('SMTP_USER', 'emailapikey'),
        pass: this.config.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async onModuleInit() {
    // Separate Redis connection for subscriptions
    this.subscriber = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://localhost:6379'),
    );

    this.subscriber.subscribe('user.password_reset', 'user.registered', (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to Redis channels', err);
      } else {
        this.logger.log('Subscribed to email event channels');
      }
    });

    this.subscriber.on('message', (channel, message) => {
      try {
        const payload = JSON.parse(message);
        switch (channel) {
          case 'user.password_reset':
            this.sendPasswordResetEmail(payload);
            break;
          case 'user.registered':
            this.sendWelcomeEmail(payload);
            break;
        }
      } catch (err) {
        this.logger.error(`Failed to process event on ${channel}`, err);
      }
    });
  }

  async onModuleDestroy() {
    await this.subscriber?.quit();
  }

  private async sendPasswordResetEmail(payload: {
    userId: string;
    email: string;
    resetToken: string;
    resetUrl: string;
  }) {
    const { email, resetUrl } = payload;

    try {
      await this.transporter.sendMail({
        from: '"Oferta Suksesi" <noreply@ofertasuksesi.com>',
        to: email,
        subject: 'Rivendos Fjalëkalimin - Oferta Suksesi',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f9fafb;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="padding:32px 24px;text-align:center;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">Rivendos Fjalëkalimin</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
        Kemi marrë një kërkesë për të rivendosur fjalëkalimin e llogarisë tënde.
      </p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background-color:#f97316;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">
        Rivendos Fjalëkalimin
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
        Ky link skadon pas 1 ore. Nëse nuk e ke kërkuar këtë, injoroje këtë email.
      </p>
    </div>
  </div>
</body>
</html>`,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${email}`, err);
    }
  }

  private async sendWelcomeEmail(payload: {
    userId: string;
    email: string;
    name: string;
  }) {
    const { email, name } = payload;

    try {
      await this.transporter.sendMail({
        from: '"Oferta Suksesi" <noreply@ofertasuksesi.com>',
        to: email,
        subject: 'Mirë se erdhe në Oferta Suksesi!',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f9fafb;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="padding:32px 24px;text-align:center;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">Mirë se erdhe, ${name}!</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
        Llogaria jote u krijua me sukses. Tani mund të fillosh të përdorësh Oferta Suksesi.
      </p>
      <a href="${this.config.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')}" style="display:inline-block;padding:12px 32px;background-color:#f97316;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">
        Hyr në Platformë
      </a>
    </div>
  </div>
</body>
</html>`,
      });
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${email}`, err);
    }
  }
}
