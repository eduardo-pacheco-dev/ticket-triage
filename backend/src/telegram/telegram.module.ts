import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { User } from '../auth/user.entity';
import { TelegramChat } from './telegram-chat.entity';
import { TelegramConfig } from './telegram-config.entity';
import { TelegramController } from './telegram.controller';
import { TelegramNotifierService } from './telegram-notifier.service';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    TypeOrmModule.forFeature([TelegramConfig]),
    TypeOrmModule.forFeature([TelegramChat]),
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramNotifierService],
  exports: [TelegramService],
})
export class TelegramModule {}
