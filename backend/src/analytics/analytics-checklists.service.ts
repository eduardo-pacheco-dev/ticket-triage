import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsChecklist } from './analytics-checklist.entity';
import { RateLimitService } from '../common/rate-limit.service';
import type { CreateAnalyticsChecklistInput } from '@ticket-triage/shared';

@Injectable()
export class AnalyticsChecklistsService {
  private readonly logger = new Logger(AnalyticsChecklistsService.name);

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

  async create(input: CreateAnalyticsChecklistInput): Promise<AnalyticsChecklist> {
    const item = this.repository.create({
      ...input,
      moduleStartDate: input.moduleStartDate ? new Date(input.moduleStartDate) : null,
      rejectionDate: input.rejectionDate ? new Date(input.rejectionDate) : null,
    });

    try {
      return await this.repository.save(item);
    } catch (error) {
      this.logger.error(`Falha ao criar registro de analytics: ${String(error)}`);
      throw new BadRequestException('Erro ao criar registro de analytics.');
    }
  }

  async createBatch(inputs: CreateAnalyticsChecklistInput[]): Promise<{ count: number }> {
    if (!this.rateLimit.check('analyticsBatchUpload')) {
      throw new BadRequestException('Muitas solicitações. Aguarde um minuto.');
    }

    const entities = inputs.map((input) =>
      this.repository.create({
        ...input,
        moduleStartDate: input.moduleStartDate ? new Date(input.moduleStartDate) : null,
        rejectionDate: input.rejectionDate ? new Date(input.rejectionDate) : null,
      }),
    );

    try {
      await this.repository.save(entities);
      return { count: entities.length };
    } catch (error) {
      this.logger.error(`Falha ao criar registros de analytics em lote: ${String(error)}`);
      throw new BadRequestException('Erro ao salvar registros de analytics.');
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.delete(id);
  }

  async removeAll(): Promise<void> {
    await this.repository.clear();
  }
}
