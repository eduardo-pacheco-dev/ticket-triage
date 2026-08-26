import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Station } from './station.entity';
import { RateLimitService } from '../common/rate-limit.service';
import { QueueEventsService } from '../queue/queue-events.service';
import type { CreateStationInput, UpdateStationInput } from '@ticket-triage/shared';

export interface PaginationInput {
  page: number;
  pageSize: number;
  search?: string;
  state?: string;
}

export interface PaginatedStations {
  items: Station[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StationStats {
  total: number;
  byStatus: Record<string, number>;
  byRegional: Record<string, number>;
  byTechnology: Record<string, number>;
}

@Injectable()
export class StationsService {
  private readonly logger = new Logger(StationsService.name);

  constructor(
    @InjectRepository(Station)
    private readonly repository: Repository<Station>,
    private readonly rateLimit: RateLimitService,
    private readonly queueEvents: QueueEventsService,
  ) {}

  async findAll(input: PaginationInput): Promise<PaginatedStations> {
    const page = Math.max(1, input.page || 1);
    const pageSize = Math.min(Math.max(1, input.pageSize || 25), 100);
    const skip = (page - 1) * pageSize;

    const qb = this.repository.createQueryBuilder('s');

    if (input.search) {
      const term = `%${input.search}%`;
      qb.andWhere(
        '(s.name LIKE :t OR s.code LIKE :t OR s.city LIKE :t OR s.responsible LIKE :t OR s.address LIKE :t OR s.site_id LIKE :t)',
        { t: term },
      );
    }

    if (input.state) {
      qb.andWhere('s.state = :state', { state: input.state });
    }

    qb.orderBy('s.name', 'ASC');

    const [items, total] = await qb.skip(skip).take(pageSize).getManyAndCount();

    return { items, total, page, pageSize };
  }

  async getStats(): Promise<StationStats> {
    const total = await this.repository.count();

    const statusRows = await this.repository
      .createQueryBuilder('s')
      .select('s.status', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.status')
      .getRawMany<{ key: string | null; count: string }>();

    const regionalRows = await this.repository
      .createQueryBuilder('s')
      .select('s.regional', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.regional')
      .getRawMany<{ key: string | null; count: string }>();

    const techRows = await this.repository
      .createQueryBuilder('s')
      .select('s.technology', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.technology')
      .getRawMany<{ key: string | null; count: string }>();

    const toMap = (rows: { key: string | null; count: string }[]): Record<string, number> => {
      const map: Record<string, number> = {};
      for (const row of rows) {
        map[row.key ?? 'Não informado'] = Number(row.count);
      }
      return map;
    };

    return {
      total,
      byStatus: toMap(statusRows),
      byRegional: toMap(regionalRows),
      byTechnology: toMap(techRows),
    };
  }

  async findOne(id: string): Promise<Station> {
    const station = await this.repository.findOne({ where: { id } });
    if (!station) throw new NotFoundException('Estação não encontrada.');
    return station;
  }

  async create(input: CreateStationInput, ip: string): Promise<Station> {
    if (!this.rateLimit.check(`createStation:${ip}`)) {
      throw new BadRequestException('Muitas solicitações. Aguarde um minuto.');
    }

    const station = this.repository.create(input);
    try {
      const saved = await this.repository.save(station);
      this.queueEvents.emit({ type: 'stations', action: 'created' });
      return saved;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ER_DUP_ENTRY')
        throw new BadRequestException('Já existe uma estação com este código.');
      this.logger.error(`Falha ao criar estação: ${String(error)}`);
      throw new BadRequestException('Erro ao criar estação.');
    }
  }

  async update(id: string, input: UpdateStationInput): Promise<Station> {
    const station = await this.findOne(id);
    Object.assign(station, input);

    try {
      const saved = await this.repository.save(station);
      this.queueEvents.emit({ type: 'stations', action: 'updated' });
      return saved;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ER_DUP_ENTRY')
        throw new BadRequestException('Já existe uma estação com este código.');
      this.logger.error(`Falha ao atualizar estação: ${String(error)}`);
      throw new BadRequestException('Erro ao atualizar estação.');
    }
  }

  async findForMap(state?: string): Promise<
    {
      id: string;
      name: string;
      code: string;
      city: string | null;
      state: string | null;
      latitude: string;
      longitude: string;
    }[]
  > {
    const qb = this.repository
      .createQueryBuilder('s')
      .select(['s.id', 's.name', 's.code', 's.city', 's.state', 's.latitude', 's.longitude'])
      .where('s.latitude IS NOT NULL AND s.latitude != :empty', { empty: '' })
      .andWhere('s.longitude IS NOT NULL AND s.longitude != :empty', { empty: '' });

    if (state) {
      qb.andWhere('s.state = :state', { state });
    }

    return qb.getMany() as Promise<
      {
        id: string;
        name: string;
        code: string;
        city: string | null;
        state: string | null;
        latitude: string;
        longitude: string;
      }[]
    >;
  }

  async findForMapBounds(params: {
    south: number;
    north: number;
    west: number;
    east: number;
    state?: string;
    search?: string;
  }): Promise<{
    items: {
      id: string;
      name: string;
      code: string;
      city: string | null;
      state: string | null;
      latitude: string;
      longitude: string;
    }[];
    total: number;
  }> {
    const qb = this.repository
      .createQueryBuilder('s')
      .select(['s.id', 's.name', 's.code', 's.city', 's.state', 's.latitude', 's.longitude'])
      .where(`CAST(REPLACE(s.latitude, ',', '.') AS DECIMAL(10,6)) BETWEEN :south AND :north`, {
        south: params.south,
        north: params.north,
      })
      .andWhere(`CAST(REPLACE(s.longitude, ',', '.') AS DECIMAL(10,6)) BETWEEN :west AND :east`, {
        west: params.west,
        east: params.east,
      })
      .andWhere('s.latitude IS NOT NULL AND s.latitude != :empty', { empty: '' })
      .andWhere('s.longitude IS NOT NULL AND s.longitude != :empty', { empty: '' });

    if (params.state) {
      qb.andWhere('s.state = :state', { state: params.state });
    }

    if (params.search) {
      const term = `%${params.search}%`;
      qb.andWhere('(s.name LIKE :t OR s.code LIKE :t OR s.city LIKE :t OR s.site_id LIKE :t)', {
        t: term,
      });
    }

    const total = await qb.getCount();
    const items = await qb.limit(2000).getMany();

    return {
      items: items as {
        id: string;
        name: string;
        code: string;
        city: string | null;
        state: string | null;
        latitude: string;
        longitude: string;
      }[],
      total,
    };
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.delete(id);
    this.queueEvents.emit({ type: 'stations', action: 'deleted' });
  }
}
