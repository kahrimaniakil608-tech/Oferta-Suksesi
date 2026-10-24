import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "./prisma.service";
import { EventListenerService } from "./event-listener.service";
import { EmailService } from "./email.service";
@Controller()
export class AppController {
  constructor(
    private readonly db: PrismaService,
    private readonly worker: EventListenerService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}
  @Get("health") getHealth() {
    return { status: "alive", service: "notification-service" };
  }
  @Get("ready") async ready() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.db.$queryRaw`SELECT 1`,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), 2000);
        }),
      ]);
      if (Date.now() - this.worker.lastSuccessfulPoll > 180000)
        throw new Error("Worker poll is stale");
      const smtpReady = await this.email.isReady();
      return {
        status: smtpReady ? "ready" : "degraded",
        smtpConfigured: Boolean(this.config.get("SMTP_USER")),
        smtpReady,
      };
    } catch {
      throw new ServiceUnavailableException("Notification worker is not ready");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
