import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SlaService } from './sla.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { updateSlaSchema, type UpdateSlaInput } from '@ticket-triage/shared';

@Controller('sla-config')
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Get()
  get() {
    return this.slaService.get();
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  update(@Body(new ZodValidationPipe(updateSlaSchema)) body: UpdateSlaInput) {
    return this.slaService.update(body);
  }
}
