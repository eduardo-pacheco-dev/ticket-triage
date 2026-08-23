import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SlaService } from './sla.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sla-config')
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Get()
  get() {
    return this.slaService.get();
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  update(
    @Body() body: { expectedWaitMin?: number; expectedServiceMin?: number },
  ) {
    return this.slaService.update(body ?? {});
  }
}
