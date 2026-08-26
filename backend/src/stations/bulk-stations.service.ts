import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BulkStation } from './bulk-station.entity';
import { RateLimitService } from '../common/rate-limit.service';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ImportJob {
  id: string;
  status: JobStatus;
  total: number;
  processed: number;
  inserted: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
  createdAt: Date;
  completedAt: Date | null;
}

const BATCH_SIZE = 2000;

@Injectable()
export class BulkStationsService {
  private readonly logger = new Logger(BulkStationsService.name);
  private readonly jobs = new Map<string, ImportJob>();

  constructor(
    @InjectRepository(BulkStation)
    private readonly repository: Repository<BulkStation>,
    private readonly rateLimit: RateLimitService,
  ) {}

  findAll() {
    return this.repository.find({ order: { siteId: 'ASC' }, take: 5000 });
  }

  async findOne(id: string): Promise<BulkStation> {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Estação não encontrada.');
    return item;
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  getJob(jobId: string): ImportJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Job não encontrado.');
    return job;
  }

  startImport(inputs: Record<string, unknown>[]): ImportJob {
    if (!this.rateLimit.check('bulkStationsUpload')) {
      throw new BadRequestException('Muitas solicitações. Aguarde um minuto.');
    }

    const jobId = crypto.randomUUID();
    const job: ImportJob = {
      id: jobId,
      status: 'pending',
      total: inputs.length,
      processed: 0,
      inserted: 0,
      skipped: 0,
      errors: 0,
      errorMessages: [],
      createdAt: new Date(),
      completedAt: null,
    };
    this.jobs.set(jobId, job);

    this.processInBackground(jobId, inputs).catch((err) => {
      this.logger.error(`Job ${jobId} falhou: ${String(err)}`);
      job.status = 'failed';
      job.completedAt = new Date();
      job.errorMessages.push('Erro interno no processamento.');
    });

    return job;
  }

  private async processInBackground(
    jobId: string,
    inputs: Record<string, unknown>[],
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';

    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      const batch = inputs.slice(i, i + BATCH_SIZE);
      const entities = batch.map((input) =>
        this.repository.create({
          ...input,
          acquisitionDate: input.acquisitionDate ? new Date(String(input.acquisitionDate)) : null,
          constructionDate: input.constructionDate
            ? new Date(String(input.constructionDate))
            : null,
          activationDate: input.activationDate ? new Date(String(input.activationDate)) : null,
          deactivationDate: input.deactivationDate
            ? new Date(String(input.deactivationDate))
            : null,
          cancellationDate: input.cancellationDate
            ? new Date(String(input.cancellationDate))
            : null,
        }),
      );

      try {
        const result = await this.repository
          .createQueryBuilder()
          .insert()
          .into(BulkStation)
          .values(entities)
          .orIgnore()
          .execute();

        job.inserted += result.raw?.affectedRows ?? entities.length;
        job.skipped += entities.length - (result.raw?.affectedRows ?? entities.length);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} falhou: ${msg}`);
        job.errors += entities.length;
        job.errorMessages.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${msg.slice(0, 200)}`);
      }

      job.processed += batch.length;
    }

    job.status = job.errors > 0 && job.errors === job.total ? 'failed' : 'completed';
    job.completedAt = new Date();
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.delete(id);
  }

  async removeAll(): Promise<void> {
    await this.repository.clear();
  }
}
