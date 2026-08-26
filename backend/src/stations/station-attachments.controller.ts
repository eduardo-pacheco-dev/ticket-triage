import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { StationAttachmentsService } from './station-attachments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('stations')
@UseGuards(JwtAuthGuard)
export class StationAttachmentsController {
  constructor(private readonly service: StationAttachmentsService) {}

  @Get(':stationId/attachments')
  list(@Param('stationId') stationId: string) {
    return this.service.listByStation(stationId);
  }

  @Post(':stationId/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(@Param('stationId') stationId: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.upload(stationId, file);
  }

  @Get('attachments/:id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const attachment = await this.service.findById(id);
    const filePath = await this.service.getFilePath(attachment.storageKey);

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
    );
    res.sendFile(filePath);
  }

  @Delete('attachments/:id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }
}
