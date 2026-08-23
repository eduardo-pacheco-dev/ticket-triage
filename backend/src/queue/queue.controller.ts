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
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { clientIp } from '../common/client-ip';
import {
  createCheckInSchema,
  updateStatusSchema,
  type CreateCheckInInput,
} from '../common/schemas';

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
    @Body(new ZodValidationPipe(createCheckInSchema)) body: CreateCheckInInput,
    @Req() request: Request,
  ) {
    return this.queueService.createCheckIn(body, clientIp(request));
  }

  @UseGuards(JwtAuthGuard)
  @Get('queue/active')
  findActive() {
    return this.queueService.findActive();
  }

  @UseGuards(JwtAuthGuard)
  @Get('queue/archived')
  findArchived() {
    return this.queueService.findArchived();
  }

  @Get('public/status/:siteId')
  findPublicBySiteId(@Param('siteId') siteId: string) {
    return this.queueService.findPublicBySiteId(siteId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('queue/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStatusSchema)) body: { status: string },
  ) {
    return this.queueService.updateStatus(id, body.status);
  }
}
