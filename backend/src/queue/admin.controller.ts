import { Controller, Get } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly queueService: QueueService) {}

  @Get('dashboard')
  getDashboard() {
    return this.queueService.getDashboard();
  }
}
