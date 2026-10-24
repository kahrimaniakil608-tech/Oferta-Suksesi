import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpamPatternType } from '@prisma/client';

@Injectable()
export class AdminSpamPatternsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.spamPattern.findMany({
      orderBy: [{ isActive: 'desc' }, { severity: 'desc' }],
    });
  }

  async create(dto: { pattern: string; type: SpamPatternType; severity?: number }) {
    return this.prisma.spamPattern.create({
      data: {
        pattern: dto.pattern,
        type: dto.type,
        severity: dto.severity ?? 1,
      },
    });
  }

  async update(id: string, dto: { pattern?: string; type?: SpamPatternType; severity?: number; isActive?: boolean }) {
    const existing = await this.prisma.spamPattern.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Spam pattern not found');

    return this.prisma.spamPattern.update({
      where: { id },
      data: {
        ...(dto.pattern !== undefined && { pattern: dto.pattern }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.severity !== undefined && { severity: dto.severity }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.spamPattern.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Spam pattern not found');

    await this.prisma.spamPattern.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Score a listing's title + description against all active spam patterns.
   * Returns a score 0-100 where higher = more likely spam.
   */
  async scoreListing(title: string, description: string): Promise<number> {
    const patterns = await this.prisma.spamPattern.findMany({
      where: { isActive: true },
    });

    if (patterns.length === 0) return 0;

    const text = `${title} ${description}`.toLowerCase();
    let totalScore = 0;

    for (const pattern of patterns) {
      let matched = false;

      switch (pattern.type) {
        case 'REGEX':
          try {
            const regex = new RegExp(pattern.pattern, 'i');
            matched = regex.test(text);
          } catch {
            // Invalid regex — skip
          }
          break;

        case 'KEYWORD':
          matched = text.includes(pattern.pattern.toLowerCase());
          break;

        case 'PHONE':
          // Match phone number patterns in text
          matched = text.includes(pattern.pattern.replace(/\s+/g, ''));
          break;
      }

      if (matched) {
        totalScore += pattern.severity * 10;
      }
    }

    return Math.min(totalScore, 100);
  }
}
