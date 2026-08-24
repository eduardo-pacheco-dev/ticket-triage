import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlaConfig } from './sla-config.entity';

@Injectable()
export class SlaService {
  constructor(
    @InjectRepository(SlaConfig)
    private readonly configRepository: Repository<SlaConfig>,
  ) {}

  private validate(expectedWaitMin: number, expectedServiceMin: number) {
    for (const [value, label] of [
      [expectedWaitMin, 'espera'],
      [expectedServiceMin, 'atendimento'],
    ] as const) {
      if (!Number.isInteger(value) || value < 1) {
        throw new BadRequestException(`Mínimo 1 minuto (${label})`);
      }
      if (value > 1440) {
        throw new BadRequestException(`Máximo 1440 minutos (24h) (${label})`);
      }
    }
  }

  async get(): Promise<SlaConfig> {
    let config = await this.findFirst();
    if (!config) {
      config = await this.configRepository.save(this.configRepository.create({}));
    }
    return config;
  }

  async update(input: { expectedWaitMin?: number; expectedServiceMin?: number }) {
    const expectedWaitMin = Number(input.expectedWaitMin);
    const expectedServiceMin = Number(input.expectedServiceMin);
    this.validate(expectedWaitMin, expectedServiceMin);

    let config = await this.findFirst();
    if (!config) {
      config = await this.configRepository.save(
        this.configRepository.create({ expectedWaitMin, expectedServiceMin }),
      );
    } else {
      config.expectedWaitMin = expectedWaitMin;
      config.expectedServiceMin = expectedServiceMin;
      config = await this.configRepository.save(config);
    }
    return config;
  }

  private findFirst(): Promise<SlaConfig | null> {
    return this.configRepository
      .find({ order: { id: 'ASC' }, take: 1 })
      .then(([config]) => config ?? null);
  }
}
