import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestType } from './request-type.entity';
import { RateLimitService } from '../common/rate-limit.service';
import { QueueEventsService } from '../queue/queue-events.service';

@Injectable()
export class RequestTypesService {
  constructor(
    @InjectRepository(RequestType)
    private readonly typesRepository: Repository<RequestType>,
    private readonly rateLimit: RateLimitService,
    private readonly queueEvents: QueueEventsService,
  ) {}

  findAll() {
    return this.typesRepository.find({ order: { name: 'ASC' } });
  }

  async create(name: string, ip: string): Promise<RequestType> {
    if (!this.rateLimit.check(`addRequestType:${ip}`)) {
      throw new BadRequestException('Muitas solicitações. Aguarde um minuto.');
    }
    const trimmed = name?.trim() ?? '';
    if (!trimmed) throw new BadRequestException('Nome é obrigatório');
    if (trimmed.length > 200) throw new BadRequestException('Nome muito longo');

    try {
      const type = this.typesRepository.create({ name: trimmed });
      const saved = await this.typesRepository.save(type);
      this.queueEvents.emit({ type: 'request_types', action: 'created' });
      return saved;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ER_DUP_ENTRY') throw new BadRequestException('Este tipo já existe.');
      console.error('[addRequestType]', error);
      throw new BadRequestException('Erro ao adicionar tipo.');
    }
  }

  async remove(id: string): Promise<void> {
    await this.typesRepository.delete(id);
    this.queueEvents.emit({ type: 'request_types', action: 'deleted' });
  }
}
