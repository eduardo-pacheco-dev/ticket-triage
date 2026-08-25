import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceOrder } from './service-order.entity';
import { RateLimitService } from '../common/rate-limit.service';
import { QueueEventsService } from '../queue/queue-events.service';
import type {
  CreateServiceOrderInput,
  UpdateServiceOrderInput,
} from '@ticket-triage/shared';

@Injectable()
export class ServiceOrdersService {
  private readonly logger = new Logger(ServiceOrdersService.name);

  constructor(
    @InjectRepository(ServiceOrder)
    private readonly repository: Repository<ServiceOrder>,
    private readonly rateLimit: RateLimitService,
    private readonly queueEvents: QueueEventsService,
  ) {}

  private async getNextOrderNumber(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('so')
      .select('MAX(so.order_number)', 'max')
      .getRawOne<{ max: string | null }>();
    return (result?.max ? Number(result.max) : 0) + 1;
  }

  findAll() {
    return this.repository.find({ order: { orderNumber: 'DESC' } });
  }

  async findOne(id: string): Promise<ServiceOrder> {
    const order = await this.repository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Ordem de serviço não encontrada.');
    return order;
  }

  async create(input: CreateServiceOrderInput, ip: string): Promise<ServiceOrder> {
    if (!this.rateLimit.check(`createServiceOrder:${ip}`)) {
      throw new BadRequestException('Muitas solicitações. Aguarde um minuto.');
    }

    const orderNumber = await this.getNextOrderNumber();
    const order = this.repository.create({
      ...input,
      orderNumber,
      scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
    });

    try {
      const saved = await this.repository.save(order);
      this.queueEvents.emit({ type: 'service_orders', action: 'created' });
      return saved;
    } catch (error) {
      this.logger.error(`Falha ao criar ordem de serviço: ${String(error)}`);
      throw new BadRequestException('Erro ao criar ordem de serviço.');
    }
  }

  async update(id: string, input: UpdateServiceOrderInput): Promise<ServiceOrder> {
    const order = await this.findOne(id);

    if (input.status && input.status !== order.status) {
      if (input.status === 'completed') {
        order.completedAt = new Date();
      } else {
        order.completedAt = null;
      }
    }

    Object.assign(order, {
      ...input,
      scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : order.scheduledDate,
    });

    try {
      const saved = await this.repository.save(order);
      this.queueEvents.emit({ type: 'service_orders', action: 'updated' });
      return saved;
    } catch (error) {
      this.logger.error(`Falha ao atualizar ordem de serviço: ${String(error)}`);
      throw new BadRequestException('Erro ao atualizar ordem de serviço.');
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.delete(id);
    this.queueEvents.emit({ type: 'service_orders', action: 'deleted' });
  }
}
