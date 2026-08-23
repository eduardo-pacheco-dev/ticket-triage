import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueEntry } from './queue-entry.entity';
import type { QueueStatus } from './queue-entry.entity';
import { RateLimitService } from '../common/rate-limit.service';
import { QueueEventsService } from './queue-events.service';

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

const ACTIVE_STATUSES: QueueStatus[] = ['waiting', 'in_review'];
const FINAL_STATUSES: QueueStatus[] = ['approved', 'rejected'];
const VALID_STATUSES: QueueStatus[] = [...ACTIVE_STATUSES, ...FINAL_STATUSES];

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

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(QueueEntry)
    private readonly queueRepository: Repository<QueueEntry>,
    private readonly rateLimit: RateLimitService,
    private readonly queueEvents: QueueEventsService,
  ) {}

  async createCheckIn(
    input: { site_id?: string; technician_name?: string; request_type?: string },
    ip: string,
  ): Promise<QueueEntryDto> {
    if (!this.rateLimit.check(`createCheckIn:${ip}`)) {
      throw new BadRequestException('Muitas solicitações. Aguarde um minuto.');
    }

    const siteId = input.site_id?.trim() ?? '';
    const technicianName = input.technician_name?.trim() ?? '';
    const requestType = input.request_type?.trim() ?? '';

    if (!siteId) throw new BadRequestException('SITE ID é obrigatório');
    if (siteId.length > 100) throw new BadRequestException('SITE ID muito longo');
    if (!technicianName) throw new BadRequestException('Nome do técnico é obrigatório');
    if (technicianName.length > 200) throw new BadRequestException('Nome do técnico muito longo');
    if (!requestType) throw new BadRequestException('Tipo de solicitação é obrigatório');
    if (requestType.length > 200) throw new BadRequestException('Tipo de solicitação muito longo');

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const n = Math.floor(1000 + Math.random() * 9000);
      const protocol = `DOC-${n}`;
      try {
        const entry = this.queueRepository.create({
          protocol,
          siteId,
          technicianName,
          requestType,
          fullName: technicianName,
          identifier: siteId,
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
    console.error('[createCheckIn]', lastError);
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

  async findArchived(): Promise<QueueEntryDto[]> {
    const entries = await this.queueRepository
      .createQueryBuilder('e')
      .where('e.status IN (:...statuses)', { statuses: FINAL_STATUSES })
      .orderBy('e.updatedAt', 'DESC')
      .getMany();
    return entries.map(toDto);
  }

  async findBySiteId(siteId: string) {
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

    return { entries: entries.map(toDto), position };
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
      slaRaw?.avgServiceSec != null
        ? Math.round(Math.round(Number(slaRaw.avgServiceSec)) / 60)
        : 0;

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
