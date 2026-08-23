import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { Repository } from 'typeorm';
import { QueueEntry } from './queue-entry.entity';
import type { QueueStatus } from './queue-entry.entity';
import { RateLimitService } from '../common/rate-limit.service';
import { QueueEventsService } from './queue-events.service';
import type { CreateCheckInInput, PaginationInput } from '@ticket-triage/shared';

export interface QueueEntryDto {
  id: string;
  protocol: string;
  full_name: string;
  identifier: string;
  site_id: string;
  technician_name: string;
  request_type: string;
  status: QueueStatus;
  created_at: Date;
  updated_at: Date;
  started_at?: Date | null;
  completed_at?: Date | null;
}

export interface PublicQueueEntryDto {
  protocol: string;
  site_id: string;
  status: QueueStatus;
}

export interface PaginatedQueueEntries {
  items: QueueEntryDto[];
  total: number;
  page: number;
  pageSize: number;
}

const ACTIVE_STATUSES: QueueStatus[] = ['waiting', 'in_review'];
const FINAL_STATUSES: QueueStatus[] = ['approved', 'rejected'];
const VALID_STATUSES: QueueStatus[] = [...ACTIVE_STATUSES, ...FINAL_STATUSES];

// Sem I, O, 1 e 0 para leitura sem ambiguidade; 32^10 combinações tornam
// colisões desprezíveis independentemente do tamanho da tabela.
const PROTOCOL_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PROTOCOL_RANDOM_LENGTH = 10;

function generateProtocol(): string {
  let suffix = '';
  for (let i = 0; i < PROTOCOL_RANDOM_LENGTH; i++) {
    suffix += PROTOCOL_ALPHABET[randomInt(PROTOCOL_ALPHABET.length)];
  }
  return `DOC-${suffix}`;
}

function toDto(e: QueueEntry): QueueEntryDto {
  return {
    id: e.id,
    protocol: e.protocol,
    full_name: e.fullName,
    identifier: e.identifier,
    site_id: e.siteId,
    technician_name: e.technicianName,
    request_type: e.requestType,
    status: e.status,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    started_at: e.startedAt,
    completed_at: e.completedAt,
  };
}

function toPublicDto(e: QueueEntry): PublicQueueEntryDto {
  return {
    protocol: e.protocol,
    site_id: e.siteId,
    status: e.status,
  };
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectRepository(QueueEntry)
    private readonly queueRepository: Repository<QueueEntry>,
    private readonly rateLimit: RateLimitService,
    private readonly queueEvents: QueueEventsService,
  ) {}

  async createCheckIn(input: CreateCheckInInput, ip: string): Promise<QueueEntryDto> {
    if (!this.rateLimit.check(`createCheckIn:${ip}`)) {
      throw new BadRequestException('Muitas solicitações. Aguarde um minuto.');
    }

    // Validação e trim já garantidos pelo ZodValidationPipe com createCheckInSchema.
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const protocol = generateProtocol();
      try {
        const entry = this.queueRepository.create({
          protocol,
          siteId: input.site_id,
          technicianName: input.technician_name,
          requestType: input.request_type,
          fullName: input.technician_name,
          identifier: input.site_id,
          status: 'waiting',
        });
        const saved = await this.queueRepository.save(entry);
        const dto = toDto(saved);
        this.emitQueueEvent('created', dto.site_id, dto.protocol, dto.status);
        return dto;
      } catch (error) {
        lastError = error;
        const code = (error as { code?: string }).code;
        if (code !== 'ER_DUP_ENTRY') break;
      }
    }
    this.logger.error(`Falha ao registrar check-in: ${String(lastError)}`);
    throw new BadRequestException('Erro ao registrar solicitação.');
  }

  private emitQueueEvent(action: string, siteId: string, protocol?: string, status?: string): void {
    this.queueEvents.emit({ type: 'queue', action, site_id: siteId, protocol, status });
  }

  async findActive(): Promise<QueueEntryDto[]> {
    const entries = await this.queueRepository
      .createQueryBuilder('e')
      .where('e.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
      .orderBy('e.createdAt', 'ASC')
      .addOrderBy('e.id', 'ASC')
      .getMany();
    return entries.map(toDto);
  }

  async findArchived({ page, pageSize }: PaginationInput): Promise<PaginatedQueueEntries> {
    const [entries, total] = await this.queueRepository
      .createQueryBuilder('e')
      .where('e.status IN (:...statuses)', { statuses: FINAL_STATUSES })
      .orderBy('e.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { items: entries.map(toDto), total, page, pageSize };
  }

  async findPublicBySiteId(
    siteId: string,
  ): Promise<{ entries: PublicQueueEntryDto[]; position: number | null }> {
    const id = siteId.trim();
    if (!id) throw new BadRequestException('SITE ID é obrigatório');

    const entries = await this.queueRepository
      .createQueryBuilder('e')
      .where('e.siteId = :siteId', { siteId: id })
      .orderBy('e.createdAt', 'DESC')
      .addOrderBy('e.id', 'DESC')
      .getMany();

    const latest = entries[0];
    let position: number | null = null;

    if (latest && ACTIVE_STATUSES.includes(latest.status)) {
      const ahead = await this.queueRepository
        .createQueryBuilder('e')
        .where('e.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
        .andWhere('(e.createdAt < :createdAt OR (e.createdAt = :createdAt AND e.id < :id))', {
          createdAt: latest.createdAt,
          id: latest.id,
        })
        .getCount();
      position = ahead + 1;
    }

    return { entries: entries.map(toPublicDto), position };
  }

  async updateStatus(id: string, status: string): Promise<QueueEntryDto> {
    if (!VALID_STATUSES.includes(status as QueueStatus)) {
      throw new BadRequestException('Status inválido.');
    }
    const entry = await this.queueRepository.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Solicitação não encontrada.');

    const next = status as QueueStatus;
    const now = new Date();

    if (next === 'in_review' && !entry.startedAt) {
      entry.startedAt = now;
    }
    if (FINAL_STATUSES.includes(next) && !entry.completedAt) {
      entry.completedAt = now;
    }
    if (next === 'waiting') {
      entry.startedAt = null;
      entry.completedAt = null;
    }
    entry.status = next;

    const dto = toDto(await this.queueRepository.save(entry));
    this.emitQueueEvent('updated', dto.site_id, dto.protocol, dto.status);
    return dto;
  }

  async getDashboard() {
    const [total, waiting, inReview, approved, rejected] = await Promise.all([
      this.queueRepository.count(),
      this.queueRepository.count({ where: { status: 'waiting' } }),
      this.queueRepository.count({ where: { status: 'in_review' } }),
      this.queueRepository.count({ where: { status: 'approved' } }),
      this.queueRepository.count({ where: { status: 'rejected' } }),
    ]);

    const recentRows = await this.queueRepository
      .createQueryBuilder('e')
      .orderBy('e.createdAt', 'DESC')
      .take(10)
      .getMany();

    const slaRaw = await this.queueRepository
      .createQueryBuilder('e')
      .select('AVG(TIMESTAMPDIFF(SECOND, e.createdAt, e.startedAt))', 'avgWaitSec')
      .addSelect('AVG(TIMESTAMPDIFF(SECOND, e.startedAt, e.completedAt))', 'avgServiceSec')
      .where('e.startedAt IS NOT NULL AND e.completedAt IS NOT NULL')
      .getRawOne<{ avgWaitSec: string | null; avgServiceSec: string | null }>();

    const avgWaitMin =
      slaRaw?.avgWaitSec != null ? Math.round(Math.round(Number(slaRaw.avgWaitSec)) / 60) : 0;
    const avgServiceMin =
      slaRaw?.avgServiceSec != null ? Math.round(Math.round(Number(slaRaw.avgServiceSec)) / 60) : 0;

    return {
      total,
      waiting,
      inReview,
      approved,
      rejected,
      avgWaitMin,
      avgServiceMin,
      recent: recentRows.map(toDto),
    };
  }
}
