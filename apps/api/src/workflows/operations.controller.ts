import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { Throttle } from "@nestjs/throttler";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { boundedInteger } from "../common/query-bounds.pipe";
class ContactDto {
  @IsUUID() requestKey!: string;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(2) @MaxLength(200) subject!: string;
  @IsString() @MinLength(10) @MaxLength(10000) message!: string;
}
class ResolutionDto {
  @IsIn(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]) status!: string;
  @IsString() @IsOptional() @MaxLength(2000) resolution?: string;
}
@Controller("contact")
export class ContactController {
  constructor(private readonly db: PrismaService) {}
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async accept(@Body() dto: ContactDto) {
    await this.db.supportMessage.createMany({
      data: [dto],
      skipDuplicates: true,
    });
    const row = await this.db.supportMessage.findUniqueOrThrow({
      where: { requestKey: dto.requestKey },
    });
    if (
      ["name", "email", "subject", "message"].some(
        (key) => (row as any)[key] !== (dto as any)[key],
      )
    )
      throw new BadRequestException(
        "Request key already used for another message",
      );
    return { accepted: true, id: row.id };
  }
}
@Controller("admin/operations")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class OperationsController {
  constructor(private readonly db: PrismaService) {}
  @Get("reports")
  async reports(
    @Query("page") page?: string,
    @Query("status") status = "OPEN",
  ) {
    if (!["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"].includes(status))
      throw new BadRequestException("Invalid status");
    const index = boundedInteger(page, 1, 1000000);
    const [data, total] = await this.db.$transaction([
      this.db.listingReport.findMany({
        where: { status },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: (index - 1) * 20,
        take: 20,
      }),
      this.db.listingReport.count({ where: { status } }),
    ]);
    const assignees = await this.db.user.findMany({where: {id: {in: data.flatMap(row => row.assignedTo ? [row.assignedTo] : [])}}, select: {id: true, name: true}});
    const names = new Map(assignees.map(user => [user.id, user.name]));
    return { data: data.map(row => ({...row, assigneeName: row.assignedTo ? names.get(row.assignedTo) ?? 'Llogari e hequr' : null})), total, page: index };
  }
  @Patch("reports/:id")
  async resolve(
    @Param("id") id: string,
    @Body() dto: ResolutionDto,
    @Req() req: any,
  ) {
    const done = ["RESOLVED", "DISMISSED"].includes(dto.status);
    if (done && !dto.resolution?.trim())
      throw new BadRequestException("A resolution is required");
    return this.db.$transaction(async (tx) => {
      const report = await tx.listingReport.update({
        where: { id },
        data: {
          status: dto.status,
          resolution: dto.resolution,
          assignedTo: req.user.id,
          resolvedBy: done ? req.user.id : null,
          resolvedAt: done ? new Date() : null,
        },
      });
      await tx.moderationLog.create({
        data: {
          action: `REPORT_${dto.status}`,
          reason: JSON.stringify({
            reportId: id,
            listingId: report.listingId,
            resolution: dto.resolution,
          }),
          moderatorId: req.user.id,
          subjectUserId: report.reporterId,
        },
      });
      return report;
    });
  }
  @Get("support")
  @Roles(Role.ADMIN)
  async support(@Query("page") page?: string, @Query("status") status?: string) {
    if (status && !['OPEN','RESOLVED'].includes(status)) throw new BadRequestException('Invalid support status');
    const where = status ? {status} : {};
    const index = boundedInteger(page, 1, 1000000);
    const [data, total] = await this.db.$transaction([
      this.db.supportMessage.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (index - 1) * 20,
        take: 20,
      }),
      this.db.supportMessage.count({where}),
    ]);
    return { data, total, page: index };
  }
  @Patch("support/:id")
  @Roles(Role.ADMIN)
  closeSupport(@Param("id") id: string, @Req() req: any) {
    return this.db.supportMessage.update({
      where: { id },
      data: { status: "RESOLVED", resolvedBy: req.user.id },
    });
  }
  @Get("deliveries")
  @Roles(Role.ADMIN)
  async deliveries(@Query("page") page?: string, @Query("topic") topic?: string) {
    const index = boundedInteger(page, 1, 1000000);
    const where = { completedAt: null, lastError: { not: null }, ...(topic ? {topic: topic.slice(0,100)} : {}) };
    const [data, total] = await this.db.$transaction([
      this.db.outboxEvent.findMany({
        where,
        select: {
          id: true,
          topic: true,
          attempts: true,
          lastError: true,
          availableAt: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (index - 1) * 20,
        take: 20,
      }),
      this.db.outboxEvent.count({ where }),
    ]);
    return { data, total, page: index };
  }
  @Post("deliveries/:id/retry")
  @Roles(Role.ADMIN)
  async retry(@Param("id") id: string) {
    const result = await this.db.outboxEvent.updateMany({
      where: {
        id,
        completedAt: null,
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
      },
      data: { attempts: 0, availableAt: new Date(), lastError: null },
    });
    return { retried: result.count === 1 };
  }
}
