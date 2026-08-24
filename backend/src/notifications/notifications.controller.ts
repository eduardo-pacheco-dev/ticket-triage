import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

function userId(request: Request): string {
  return ((request.user ?? { sub: '' }) as JwtPayload).sub;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Req() request: Request) {
    return this.notificationsService.list(userId(request));
  }

  @Post('read-all')
  async markAllRead(@Req() request: Request) {
    await this.notificationsService.markAllRead(userId(request));
    return { ok: true };
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @Req() request: Request) {
    await this.notificationsService.markRead(userId(request), id);
    return { ok: true };
  }
}
