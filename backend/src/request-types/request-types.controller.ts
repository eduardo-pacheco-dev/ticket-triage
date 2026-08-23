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

@Controller('request-types')
export class RequestTypesController {
  constructor(private readonly typesService: RequestTypesService) {}

  @Get()
  findAll() {
    return this.typesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: { name?: string }, @Req() request: Request) {
    const ip =
      (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ||
      request.ip ||
      'unknown';
    return this.typesService.create(body?.name ?? '', ip);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.typesService.remove(id);
  }
}
