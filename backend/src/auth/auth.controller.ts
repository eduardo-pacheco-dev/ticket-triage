import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { clientIp } from '../common/client-ip';
import {
  changePasswordSchema,
  loginSchema,
  type ChangePasswordInput,
  type LoginInput,
} from '@ticket-triage/shared';

function payloadOf(request: Request): JwtPayload {
  return request.user ?? { sub: '', username: '', tv: 0 };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput, @Req() request: Request) {
    return this.authService.login(body.username, body.password, clientIp(request));
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() request: Request,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ) {
    const result = await this.authService.changePassword(
      payloadOf(request).sub,
      body.currentPassword,
      body.newPassword,
    );
    return { ok: true, access_token: result.access_token };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() request: Request) {
    await this.authService.logout(payloadOf(request).sub);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: Request) {
    return payloadOf(request);
  }
}
