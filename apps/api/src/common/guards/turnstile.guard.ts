import { PrismaService } from '../../prisma/prisma.service';
import { submissionFingerprint } from '../../listings/submission-fingerprint';
import { createHash } from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name);
  private readonly secretKey: string;

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    this.secretKey = this.config.get<string>('TURNSTILE_SECRET_KEY', '');
    const mode = this.config.get<string>('NODE_ENV');
    if (!this.secretKey && mode !== 'development' && mode !== 'test') {
      throw new Error('TURNSTILE_SECRET_KEY is required outside explicit development/test mode');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip in development if no secret key configured
    if (!this.secretKey) {
      this.logger.warn('Turnstile secret key not configured — skipping verification');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.body?.turnstileToken;
    if (request.path?.endsWith('/listings/guest') && typeof request.body?.requestId === 'string') {
      const identity = createHash('sha256').update(request.ip ?? 'unknown').digest('hex');
      const saved = await this.prisma.submission.findUnique({ where: { key: `guest:${identity}:${request.body.requestId}` } });
      if (saved?.fingerprint === submissionFingerprint(request.body)) return true;
    }

    if (!token) {
      throw new BadRequestException('Verifikimi anti-bot mungon. Ju lutem provoni përsëri.');
    }

    const ip = request.ip ?? '';
    let data: { success: boolean; 'error-codes'?: string[] };
    try {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: this.secretKey,
          response: token,
          remoteip: ip,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error('Verification unavailable');
      data = (await res.json()) as typeof data;
    } catch {
      throw new ServiceUnavailableException('Verifikimi anti-bot nuk është i disponueshëm. Provo sërish.');
    }

    if (!data.success) {
      this.logger.warn(`Turnstile verification failed: ${JSON.stringify(data['error-codes'])}`);
      throw new BadRequestException('Verifikimi anti-bot dështoi. Ju lutem provoni përsëri.');
    }

    return true;
  }
}
