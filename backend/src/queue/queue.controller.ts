import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('checkin')
  createCheckIn(
    @Body() body: { site_id?: string; technician_name?: string; request_type?: string },
    @Req() request: Request,
  ) {
    const ip =
      (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ||
      request.ip ||
      'unknown';
    return this.queueService.createCheckIn(body ?? {}, ip);
  }

  @Get('queue/active')
  findActive() {
    return this.queueService.findActive();
  }

  @Get('queue/archived')
  findArchived() {
    return this.queueService.findArchived();
  }

  @Get('queue/site/:siteId')
  findBySiteId(@Param('siteId') siteId: string) {
    return this.queueService.findBySiteId(siteId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('queue/:id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status?: string }) {
    return this.queueService.updateStatus(id, body?.status ?? '');
  }
}
