import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequestTypesService } from './request-types.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { clientIp } from '../common/client-ip';
import { createRequestTypeSchema, type CreateRequestTypeInput } from '@ticket-triage/shared';

@Controller('request-types')
export class RequestTypesController {
  constructor(private readonly typesService: RequestTypesService) {}

  @Get()
  findAll() {
    return this.typesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body(new ZodValidationPipe(createRequestTypeSchema)) body: CreateRequestTypeInput,
    @Req() request: Request,
  ) {
    return this.typesService.create(body.name, clientIp(request));
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.typesService.remove(id);
  }
}
