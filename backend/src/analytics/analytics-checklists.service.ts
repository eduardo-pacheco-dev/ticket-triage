import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsChecklist } from './analytics-checklist.entity';
import { RateLimitService } from '../common/rate-limit.service';
import type { CreateAnalyticsChecklistInput } from '@ticket-triage/shared';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ImportJob {
  id: string;
  status: JobStatus;
  total: number;
  processed: number;
  errors: number;
  errorMessages: string[];
  createdAt: Date;
  completedAt: Date | null;
}

const BATCH_SIZE = 500;

@Injectable()
export class AnalyticsChecklistsService {
  private readonly logger = new Logger(AnalyticsChecklistsService.name);
  private readonly jobs = new Map<string, ImportJob>();

  constructor(
    @InjectRepository(AnalyticsChecklist)
    private readonly repository: Repository<AnalyticsChecklist>,
    private readonly rateLimit: RateLimitService,
  ) {}

  findAll() {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<AnalyticsChecklist> {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Registro de analytics não encontrado.');
    return item;
  }

  getJob(jobId: string): ImportJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Job não encontrado.');
    return job;
  }

  startImport(inputs: CreateAnalyticsChecklistInput[]): ImportJob {
    if (!this.rateLimit.check('analyticsBatchUpload')) {
      throw new BadRequestException('Muitas solicitações. Aguarde um minuto.');
    }

    const jobId = crypto.randomUUID();
    const job: ImportJob = {
      id: jobId,
      status: 'pending',
      total: inputs.length,
      processed: 0,
      errors: 0,
      errorMessages: [],
      createdAt: new Date(),
      completedAt: null,
    };
    this.jobs.set(jobId, job);

    this.processInBackground(jobId, inputs).catch((err) => {
      this.logger.error(`Job ${jobId} falhou inesperadamente: ${String(err)}`);
      job.status = 'failed';
      job.completedAt = new Date();
      job.errorMessages.push('Erro interno no processamento.');
    });

    return job;
  }

  private async processInBackground(
    jobId: string,
    inputs: CreateAnalyticsChecklistInput[],
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';

    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      const batch = inputs.slice(i, i + BATCH_SIZE);
      const entities = batch.map((input) =>
        this.repository.create({
          ...input,
          moduleStartDate: input.moduleStartDate ? new Date(input.moduleStartDate) : null,
          rejectionDate: input.rejectionDate ? new Date(input.rejectionDate) : null,
        }),
      );

      try {
        await this.repository.save(entities);
        job.processed += entities.length;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Batch ${i / BATCH_SIZE + 1} falhou: ${msg}`);
        job.errors += entities.length;
        job.errorMessages.push(`Lote ${i / BATCH_SIZE + 1}: ${msg.slice(0, 200)}`);
        job.processed += entities.length;
      }
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
