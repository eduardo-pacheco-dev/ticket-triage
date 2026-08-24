import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TelegramService } from './telegram.service';

@Controller('admin/telegram')
@UseGuards(JwtAuthGuard)
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Get()
  getStatus() {
    return this.telegram.getStatus();
  }

  @Put()
  updateConfig(@Body() body: { token?: string; chatId?: string }) {
    const input: { token?: string; chatId?: string } = {};
    if (typeof body.token === 'string') input.token = body.token;
    if (typeof body.chatId === 'string') input.chatId = body.chatId;
    return this.telegram.updateConfig(input);
  }

  @Post('test')
  sendTest() {
    return this.telegram.sendTestMessage();
  }
}
