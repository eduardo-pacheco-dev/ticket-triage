import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink, access } from 'node:fs/promises';
import { join } from 'node:path';
import { StationAttachment } from './station-attachment.entity';

const UPLOAD_DIR = join('uploads', 'stations');

@Injectable()
export class StationAttachmentsService {
  constructor(
    @InjectRepository(StationAttachment)
    private readonly repo: Repository<StationAttachment>,
  ) {}

  async listByStation(stationId: string): Promise<StationAttachment[]> {
    return this.repo.find({
      where: { stationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<StationAttachment> {
    const attachment = await this.repo.findOne({ where: { id } });
    if (!attachment) throw new NotFoundException('Anexo não encontrado.');
    return attachment;
  }

  async upload(stationId: string, file: Express.Multer.File): Promise<StationAttachment> {
    const storageKey = randomUUID();
    const ext = file.originalname.includes('.') ? '.' + file.originalname.split('.').pop() : '';
    const filePath = join(UPLOAD_DIR, `${storageKey}${ext}`);

    await writeFile(filePath, file.buffer);

    const attachment = this.repo.create({
      stationId,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageKey,
    });

    return this.repo.save(attachment);
  }

  async getFilePath(storageKey: string): Promise<string> {
    const attachment = await this.repo.findOne({ where: { storageKey } });
    if (!attachment) throw new NotFoundException('Anexo não encontrado.');

    const ext = attachment.filename.includes('.') ? '.' + attachment.filename.split('.').pop() : '';
    const filePath = join(UPLOAD_DIR, `${storageKey}${ext}`);

    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('Arquivo não encontrado no disco.');
    }

    return filePath;
  }

  async remove(id: string): Promise<void> {
    const attachment = await this.repo.findOne({ where: { id } });
    if (!attachment) throw new NotFoundException('Anexo não encontrado.');

    const ext = attachment.filename.includes('.') ? '.' + attachment.filename.split('.').pop() : '';
    const filePath = join(UPLOAD_DIR, `${attachment.storageKey}${ext}`);

    try {
      await unlink(filePath);
    } catch {
      // ignore if file doesn't exist on disk
    }

    await this.repo.remove(attachment);
  }
}
