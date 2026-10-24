import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { AuthSessionsService, SessionPayload } from './auth-sessions.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly sessions: AuthSessionsService) {
    const jwtSecret = config.get<string>('JWT_SECRET');
    if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.os_access ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      algorithms: ['HS256'],
    });
  }

  validate(payload: SessionPayload) {
    return this.sessions.validateAccess(payload);
  }
}
