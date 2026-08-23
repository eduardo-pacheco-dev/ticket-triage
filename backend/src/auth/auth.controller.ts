import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './jwt-auth.guard';

function payloadOf(request: Request): JwtPayload {
  return request.user ?? { sub: '', username: '' };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { username?: string; password?: string }) {
    if (!body.username || !body.password) {
      throw new UnauthorizedException('Credenciais obrigatórias.');
    }
    return this.authService.login(body.username, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() request: Request,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    await this.authService.changePassword(
      payloadOf(request).sub,
      body.currentPassword ?? '',
      body.newPassword ?? '',
    );
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: Request) {
    return payloadOf(request);
  }
}
