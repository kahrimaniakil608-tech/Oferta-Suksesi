import { openPayload } from "./private-payload";
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { claimJobs, finishJob } from "./outbox";
import { EmailService } from "./email.service";
import { PrismaService } from "./prisma.service";
import * as templates from "./templates";

// Event channel constants (match packages/shared/src/events/index.ts)
const CHANNELS = {
  USER_REGISTERED: "user.registered",
  USER_PASSWORD_RESET: "user.password_reset",
  LISTING_AUTO_APPROVED: "listing.auto_approved",
  LISTING_APPROVED: "listing.approved",
  LISTING_REJECTED: "listing.rejected",
  LISTING_EXPIRED: "listing.expired",
  LISTING_EXPIRING_SOON: "listing.expiring_soon",
} as const;

// Payload types
interface UserRegisteredPayload {
  eventId?: string;
  userId: string;
  email: string;
  name: string;
}
interface UserPasswordResetPayload {
  eventId?: string;
  userId: string;
  email: string;
  resetToken: string;
  resetUrl: string;
}
interface ListingAutoApprovedPayload {
  eventId?: string;
  listingId: string;
  userId: string;
  title: string;
}
interface ListingApprovedPayload {
  eventId?: string;
  listingId: string;
  userId: string | null;
  isGuestListing: boolean;
  scoreIncrement: number;
}
interface ListingRejectedPayload {
  eventId?: string;
  listingId: string;
  userId: string | null;
  reason: string;
}
interface ListingExpiredPayload {
  eventId?: string;
  listingId: string;
  userId: string | null;
  title: string;
}
interface ListingExpiringSoonPayload {
  eventId?: string;
  listingId: string;
  userId: string | null;
  title: string;
  expiresAt: string;
}

@Injectable()
export class EventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventListenerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  lastSuccessfulPoll = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.deliver();
    }, 5000);
    void this.deliver();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async deliver() {
    if (this.busy) return;
    this.busy = true;
    try {
      const jobs = await claimJobs(this.prisma, Object.values(CHANNELS));
      this.lastSuccessfulPoll = Date.now();
      await Promise.all(
        jobs.map(async (job) => {
          try {
            await this.handleEvent(
              job.topic,
              JSON.stringify(job.payload),
              job.id,
            );
            await finishJob(this.prisma, job);
          } catch (error) {
            await finishJob(this.prisma, job, error);
            this.logger.error(
              `Delivery ${job.id} failed; attempt ${job.attempts}`,
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error("Cannot claim notification work", error);
    } finally {
      this.busy = false;
    }
  }

  private async handleEvent(
    channel: string,
    message: string,
    eventId: string,
  ): Promise<void> {
    const stored = JSON.parse(message);
    const payload = {
      ...(stored.sealed
        ? openPayload(
            stored,
            this.config.get<string>("OUTBOX_SECRET") ||
              this.config.get<string>("JWT_SECRET", ""),
          )
        : stored),
      eventId,
    };

    switch (channel) {
      case CHANNELS.USER_REGISTERED:
        return this.onUserRegistered(payload);
      case CHANNELS.USER_PASSWORD_RESET:
        return this.onPasswordReset(payload);
      case CHANNELS.LISTING_AUTO_APPROVED:
        return this.onListingAutoApproved(payload);
      case CHANNELS.LISTING_APPROVED:
        return this.onListingApproved(payload);
      case CHANNELS.LISTING_REJECTED:
        return this.onListingRejected(payload);
      case CHANNELS.LISTING_EXPIRED:
        return this.onListingExpired(payload);
      case CHANNELS.LISTING_EXPIRING_SOON:
        return this.onListingExpiringSoon(payload);
    }
  }

  private async onUserRegistered(payload: UserRegisteredPayload) {
    const appUrl = this.config.get<string>(
      "NEXT_PUBLIC_APP_URL",
      "http://localhost:3000",
    );
    const { subject, html } = templates.welcomeEmail(payload.name, appUrl);
    await this.email.send({
      eventId: payload.eventId,
      to: payload.email,
      subject,
      html,
      template: "welcome",
      userId: payload.userId,
    });
  }

  private async onPasswordReset(payload: UserPasswordResetPayload) {
    const { subject, html } = templates.passwordResetEmail(payload.resetUrl);
    await this.email.send({
      eventId: payload.eventId,
      to: payload.email,
      subject,
      html,
      template: "password_reset",
      userId: payload.userId,
    });
  }

  private async onListingAutoApproved(payload: ListingAutoApprovedPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true, notificationPrefs: true, deletedAt: true },
    });
    if (
      !user ||
      user.deletedAt ||
      (user.notificationPrefs as Record<string, unknown>)?.listing_approved ===
        false
    )
      return;

    const appUrl = this.config.get<string>(
      "NEXT_PUBLIC_APP_URL",
      "http://localhost:3000",
    );
    const listingUrl = `${appUrl}/shpalljet/${encodeURIComponent(payload.listingId)}`;
    const { subject, html } = templates.listingAutoApprovedEmail(
      payload.title,
      listingUrl,
    );
    await this.email.send({
      eventId: payload.eventId,
      to: user.email,
      subject,
      html,
      template: "listing_auto_approved",
      userId: payload.userId,
    });
  }

  private async onListingApproved(payload: ListingApprovedPayload) {
    if (!payload.userId || payload.isGuestListing) return;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true, notificationPrefs: true, deletedAt: true },
    });
    if (
      !user ||
      user.deletedAt ||
      (user.notificationPrefs as Record<string, unknown>)?.listing_approved ===
        false
    )
      return;

    const appUrl = this.config.get<string>(
      "NEXT_PUBLIC_APP_URL",
      "http://localhost:3000",
    );
    const listingUrl = `${appUrl}/shpalljet/${encodeURIComponent(payload.listingId)}`;
    const { subject, html } = templates.listingApprovedEmail(
      "Shpallja juaj",
      listingUrl,
    );
    await this.email.send({
      eventId: payload.eventId,
      to: user.email,
      subject,
      html,
      template: "listing_approved",
      userId: payload.userId,
    });
  }

  private async onListingRejected(payload: ListingRejectedPayload) {
    if (!payload.userId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true, notificationPrefs: true, deletedAt: true },
    });
    if (
      !user ||
      user.deletedAt ||
      (user.notificationPrefs as Record<string, unknown>)?.listing_rejected ===
        false
    )
      return;

    const listing = await this.prisma.listing.findUnique({
      where: { id: payload.listingId },
      select: { title: true },
    });

    const decision = payload.reason
      ? null
      : await this.prisma.moderationLog.findFirst({
          where: { listingId: payload.listingId, action: "REJECTED" },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { reason: true },
        });
    const { subject, html } = templates.listingRejectedEmail(
      listing?.title ?? "Shpallja juaj",
      payload.reason ??
        decision?.reason ??
        "Shpallja kërkon ndryshime. Shikoni panelin tuaj për arsyen.",
    );
    await this.email.send({
      eventId: payload.eventId,
      to: user.email,
      subject,
      html,
      template: "listing_rejected",
      userId: payload.userId,
    });
  }

  private async onListingExpired(payload: ListingExpiredPayload) {
    if (!payload.userId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true, notificationPrefs: true, deletedAt: true },
    });
    if (
      !user ||
      user.deletedAt ||
      (user.notificationPrefs as Record<string, unknown>)?.listing_expired ===
        false
    )
      return;

    const appUrl = this.config.get<string>(
      "NEXT_PUBLIC_APP_URL",
      "http://localhost:3000",
    );
    const renewUrl = `${appUrl}/paneli/shpalljet`;
    const { subject, html } = templates.listingExpiredEmail(
      payload.title,
      renewUrl,
    );
    await this.email.send({
      eventId: payload.eventId,
      to: user.email,
      subject,
      html,
      template: "listing_expired",
      userId: payload.userId,
    });
  }

  private async onListingExpiringSoon(payload: ListingExpiringSoonPayload) {
    if (!payload.userId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true, notificationPrefs: true, deletedAt: true },
    });
    if (
      !user ||
      user.deletedAt ||
      (user.notificationPrefs as Record<string, unknown>)
        ?.listing_expiring_soon === false
    )
      return;

    const appUrl = this.config.get<string>(
      "NEXT_PUBLIC_APP_URL",
      "http://localhost:3000",
    );
    const renewUrl = `${appUrl}/paneli/shpalljet`;
    const { subject, html } = templates.listingExpiringSoonEmail(
      payload.title,
      payload.expiresAt,
      renewUrl,
    );
    await this.email.send({
      eventId: payload.eventId,
      to: user.email,
      subject,
      html,
      template: "listing_expiring_soon",
      userId: payload.userId,
    });
  }
}
