import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TelegramNotifierService } from './telegram-notifier.service';
import { TelegramService } from './telegram.service';

@Module({
  imports: [CommonModule],
  providers: [TelegramService, TelegramNotifierService],
  exports: [TelegramService],
})
export class TelegramModule {}
