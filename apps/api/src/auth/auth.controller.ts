import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TurnstileGuard } from '../common/guards/turnstile.guard';

const ACCESS_TOKEN_MAX_AGE = 8 * 60 * 60 * 1000;      // 8 hours
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('os_access', accessToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: '/',
    });
    res.cookie('os_refresh', refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/api/v1/auth',
    });
  }

  private clearTokenCookies(res: Response) {
    res.clearCookie('os_access', { path: '/' });
    res.clearCookie('os_refresh', { path: '/api/v1/auth' });
  }

  @Post('register')
  @UseGuards(TurnstileGuard)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'User registered, tokens returned' })
  @ApiConflictResponse({ description: 'Email already in use' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'Tokens returned' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and get new token pair' })
  @ApiOkResponse({ description: 'New token pair returned' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.os_refresh;
    if (!refreshToken) {
      res.status(401);
      return { message: 'No refresh token' };
    }
    try {
      const result = await this.authService.refresh(refreshToken);
      this.setTokenCookies(res, result.accessToken, result.refreshToken);
      return { user: result.user };
    } catch (error) {
      if (error instanceof UnauthorizedException) this.clearTokenCookies(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current session and clear auth cookies' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const access = req.cookies?.os_access ?? req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    try { await this.authService.logout(access, req.cookies?.os_refresh); }
    finally { this.clearTokenCookies(res); }
    return { message: 'Logged out' };
  }

  @Post('forgot-password')
  @UseGuards(TurnstileGuard)
  @Throttle({ default: { ttl: 900000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiOkResponse({ description: 'Reset email sent if account exists' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Get('verify-reset-token')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Check if a password reset token is still valid' })
  @ApiOkResponse({ description: 'Token validity status' })
  async verifyResetToken(@Query('token') token: string) {
    const valid = await this.authService.verifyResetToken(token);
    return { valid };
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 900000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiOkResponse({ description: 'Password updated' })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
