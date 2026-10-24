import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SpamScoringService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Score text against all active spam patterns.
   * Returns 0-100 where higher = more likely spam.
   */
  async score(title: string, description: string, client: Prisma.TransactionClient = this.prisma): Promise<number> {
    const patterns = await client.spamPattern.findMany({
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
            matched = new RegExp(pattern.pattern, 'i').test(text);
          } catch {
            // Invalid regex — skip
          }
          break;
        case 'KEYWORD':
          matched = text.includes(pattern.pattern.toLowerCase());
          break;
        case 'PHONE':
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
