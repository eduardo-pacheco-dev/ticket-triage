import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ServiceOrdersService } from './service-orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { clientIp } from '../common/client-ip';
import {
  createServiceOrderSchema,
  updateServiceOrderSchema,
  type CreateServiceOrderInput,
  type UpdateServiceOrderInput,
} from '@ticket-triage/shared';

@Controller('service-orders')
@UseGuards(JwtAuthGuard)
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get()
  findAll() {
    return this.serviceOrdersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceOrdersService.findOne(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createServiceOrderSchema)) body: CreateServiceOrderInput,
    @Req() request: Request,
  ) {
    return this.serviceOrdersService.create(body, clientIp(request));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateServiceOrderSchema)) body: UpdateServiceOrderInput,
  ) {
    return this.serviceOrdersService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.serviceOrdersService.remove(id);
  }
}
