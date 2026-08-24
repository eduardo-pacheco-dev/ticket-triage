import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { QueueEventPayload, QueueEventsService } from '../queue/queue-events.service';
import { formatQueueMessage, TelegramService } from './telegram.service';

@Injectable()
export class TelegramNotifierService implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramNotifierService.name);
  private readonly subscription: Subscription;

  constructor(
    private readonly queueEvents: QueueEventsService,
    private readonly telegram: TelegramService,
  ) {
    this.subscription = this.queueEvents.stream.subscribe((event) => {
      void this.handle(event);
    });
  }

  onModuleDestroy(): void {
    this.subscription.unsubscribe();
  }

  private async handle(event: QueueEventPayload): Promise<void> {
    if (event.type !== 'notification' || !event.title) return;
    const text = formatQueueMessage({
      title: event.title,
      body: event.body ?? '',
      protocol: event.protocol ?? null,
    });
    await this.telegram.sendMessage(text);
  }
}
