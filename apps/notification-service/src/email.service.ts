import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { PrismaService } from "./prisma.service";
import { EmailLogStatus } from "@prisma/client";

export interface SendEmailOptions {
  eventId?: string;
  to: string;
  subject: string;
  html: string;
  template: string;
  userId?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: nodemailer.Transporter;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const host = this.config.get<string>("SMTP_HOST", "smtp.example.com");
    const port = this.config.get<number>("SMTP_PORT", 587);
    const user = this.config.get<string>("SMTP_USER", "");
    const pass = this.config.get<string>("SMTP_PASS", "");

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: Number(port) === 465,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 60000,
      auth: user && pass ? { user, pass } : undefined,
    });

    if (user) {
      this.logger.log(`SMTP configured: ${host}:${port} as ${user}`);
    } else {
      this.logger.warn("SMTP credentials not set — emails will not be sent");
    }
  }

  async send(options: SendEmailOptions): Promise<void> {
    if (
      options.eventId &&
      (
        await this.prisma.emailLog.findUnique({
          where: { eventId: options.eventId },
        })
      )?.status === EmailLogStatus.SENT
    )
      return;
    const from = this.config.get<string>(
      "SMTP_FROM",
      "noreply@ofertasuksesi.com",
    );
    const smtpUser = this.config.get<string>("SMTP_USER", "");

    if (!smtpUser) {
      this.logger.warn(
        `Skipping email to ${options.to} (SMTP not configured): ${options.subject}`,
      );
      await this.logEmail(
        options,
        EmailLogStatus.FAILED,
        "SMTP not configured",
      );
      throw new Error("SMTP not configured");
    }

    try {
      await this.transporter.sendMail({
        from,
        ...(options.eventId && {
          messageId: `<${options.eventId}@ofertasuksesi.com>`,
        }),
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
      await this.logEmail(options, EmailLogStatus.SENT);
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error.message}`,
      );
      await this.logEmail(options, EmailLogStatus.FAILED, error.message);
      throw error;
    }
  }

  async isReady(): Promise<boolean> {
    if (!this.config.get<string>("SMTP_USER") || !this.transporter)
      return false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.transporter.verify(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("SMTP timeout")), 2000);
        }),
      ]);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  private async logEmail(
    options: SendEmailOptions,
    status: EmailLogStatus,
    error?: string,
  ): Promise<void> {
    try {
      const data = {
        userId: options.userId ?? null,
        template: options.template,
        subject: options.subject,
        status,
        error: error ?? null,
        sentAt: status === EmailLogStatus.SENT ? new Date() : null,
      };
      if (options.eventId)
        await this.prisma.emailLog.upsert({
          where: { eventId: options.eventId },
          create: { ...data, eventId: options.eventId },
          update: data,
        });
      else await this.prisma.emailLog.create({ data });
    } catch (e: any) {
      this.logger.error(`Failed to log email: ${e.message}`);
    }
  }
}
