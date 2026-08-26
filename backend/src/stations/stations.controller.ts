import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { StationsService } from './stations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { clientIp } from '../common/client-ip';
import {
  createStationSchema,
  updateStationSchema,
  type CreateStationInput,
  type UpdateStationInput,
} from '@ticket-triage/shared';

@Controller('stations')
@UseGuards(JwtAuthGuard)
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('state') state?: string,
  ) {
    return this.stationsService.findAll({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 25,
      search: search || undefined,
      state: state || undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stationsService.findOne(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createStationSchema)) body: CreateStationInput,
    @Req() request: Request,
  ) {
    return this.stationsService.create(body, clientIp(request));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStationSchema)) body: UpdateStationInput,
  ) {
    return this.stationsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.stationsService.remove(id);
  }
}
