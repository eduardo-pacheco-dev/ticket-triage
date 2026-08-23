import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, map, merge, interval } from 'rxjs';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueueEventsService } from './queue-events.service';

@Controller()
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly queueEvents: QueueEventsService,
  ) {}

  @Sse('queue/events')
  events(): Observable<MessageEvent> {
    return merge(
      this.queueEvents.stream.pipe(map((data): MessageEvent => ({ data }))),
      interval(25_000).pipe(map((): MessageEvent => ({ data: { type: 'ping' } }))),
    );
  }

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
