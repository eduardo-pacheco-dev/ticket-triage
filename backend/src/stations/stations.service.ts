import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Station } from './station.entity';
import { RateLimitService } from '../common/rate-limit.service';
import { QueueEventsService } from '../queue/queue-events.service';
import type { CreateStationInput, UpdateStationInput } from '@ticket-triage/shared';

@Injectable()
export class StationsService {
  private readonly logger = new Logger(StationsService.name);

  constructor(
    @InjectRepository(Station)
    private readonly repository: Repository<Station>,
    private readonly rateLimit: RateLimitService,
    private readonly queueEvents: QueueEventsService,
  ) {}

  findAll() {
    return this.repository.find({ order: { name: 'ASC' } });
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

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.delete(id);
    this.queueEvents.emit({ type: 'stations', action: 'deleted' });
  }
}
