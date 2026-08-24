import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { QueueEventsService } from '../queue/queue-events.service';

@Module({
  providers: [RateLimitService, QueueEventsService],
  exports: [RateLimitService, QueueEventsService],
})
export class CommonModule {}
