import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueueService } from './queue.service';
import type { QueueEntry } from './queue-entry.entity';
import type { QueueStatus } from './queue-entry.entity';
import { RateLimitService } from '../common/rate-limit.service';
import { QueueEventsService } from './queue-events.service';

type QbOverrides = {
  getMany?: QueueEntry[];
  getCount?: number;
  getRawOne?: Record<string, unknown> | null;
};

function makeQb(overrides: QbOverrides = {}) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(overrides.getMany ?? []),
    getCount: jest.fn().mockResolvedValue(overrides.getCount ?? 0),
    getRawOne: jest.fn().mockResolvedValue('getRawOne' in overrides ? overrides.getRawOne : null),
  };
}

type QbMock = ReturnType<typeof makeQb>;

function makeEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  const base: QueueEntry = {
    id: '00000000-0000-4000-8000-000000000001',
    protocol: 'DOC-1234',
    fullName: 'Ana Souza',
    identifier: 'SITE-100',
    siteId: 'SITE-100',
    technicianName: 'Ana Souza',
    requestType: 'Instalação',
    status: 'waiting',
    createdAt: new Date('2026-08-20T10:00:00Z'),
    updatedAt: new Date('2026-08-20T10:00:00Z'),
    startedAt: null,
    completedAt: null,
  };
  return Object.assign(base, overrides);
}

function buildService(qbFactory: (...args: unknown[]) => QbMock) {
  const repo = {
    create: jest.fn((data: Partial<QueueEntry>) => makeEntry(data)),
    save: jest.fn(async (entry: QueueEntry) => entry),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(() => qbFactory()),
  };
  const events = { emit: jest.fn() };
  const service = new QueueService(
    repo as never,
    new RateLimitService(),
    events as unknown as QueueEventsService,
  );
  return { service, repo, events };
}

describe('QueueService', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('createCheckIn', () => {
    it('cria entrada com protocolo DOC-XXXX, dados normalizados e status waiting', async () => {
      const { service, repo, events } = buildService(() => makeQb());

      const dto = await service.createCheckIn(
        { site_id: ' SITE-100 ', technician_name: ' Ana ', request_type: ' Instalação ' },
        '10.0.0.1',
      );

      expect(dto.protocol).toMatch(/^DOC-\d{4}$/);
      expect(dto.site_id).toBe('SITE-100');
      expect(dto.technician_name).toBe('Ana');
      expect(dto.request_type).toBe('Instalação');
      expect(dto.status).toBe('waiting');

      const created = repo.create.mock.calls[0][0];
      expect(created).toMatchObject({
        protocol: expect.stringMatching(/^DOC-\d{4}$/),
        siteId: 'SITE-100',
        technicianName: 'Ana',
        fullName: 'Ana',
        identifier: 'SITE-100',
        status: 'waiting',
      });

      expect(events.emit).toHaveBeenCalledWith({
        type: 'queue',
        action: 'created',
        site_id: 'SITE-100',
        protocol: dto.protocol,
        status: 'waiting',
      });
    });

    it('rejeita quando o rate limit do IP é excedido', async () => {
      const { service } = buildService(() => makeQb());
      // Consome a janela de 30 requisições por minuto do IP.
      for (let i = 0; i < 30; i++) {
        await expect(
          service.createCheckIn(
            { site_id: `S-${i}`, technician_name: 'Ana', request_type: 'Troca' },
            '10.9.9.9',
          ),
        ).resolves.toBeDefined();
      }

      await expect(
        service.createCheckIn(
          { site_id: 'S-31', technician_name: 'Ana', request_type: 'Troca' },
          '10.9.9.9',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it.each([
      [{ site_id: '', technician_name: 'Ana', request_type: 'Troca' }, /SITE ID é obrigatório/],
      [
        { site_id: 'S1'.repeat(60), technician_name: 'Ana', request_type: 'Troca' },
        /SITE ID muito longo/,
      ],
      [
        { site_id: 'S1', technician_name: '', request_type: 'Troca' },
        /Nome do técnico é obrigatório/,
      ],
      [
        { site_id: 'S1', technician_name: 'Ana', request_type: '' },
        /Tipo de solicitação é obrigatório/,
      ],
    ])('valida entrada %j', async (input, expectedMessage) => {
      const { service } = buildService(() => makeQb());
      const error = await service.createCheckIn(input as never, 'ip').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toMatch(expectedMessage);
    });

    it('repete até 5 protocolos em caso de colisão (ER_DUP_ENTRY) e persiste', async () => {
      let calls = 0;
      const repo = {
        create: jest.fn((data: Partial<QueueEntry>) => makeEntry(data)),
        save: jest.fn(async (entry: QueueEntry) => {
          calls++;
          if (calls <= 2) {
            throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
          }
          return entry;
        }),
        createQueryBuilder: jest.fn(() => makeQb()),
      };
      const service = new QueueService(repo as never, new RateLimitService(), {
        emit: jest.fn(),
      } as unknown as QueueEventsService);

      const dto = await service.createCheckIn(
        { site_id: 'SITE-200', technician_name: 'Bruno', request_type: 'Manutenção' },
        '10.0.0.2',
      );

      expect(repo.create).toHaveBeenCalledTimes(3);
      expect(dto.site_id).toBe('SITE-200');
    });

    it('lança BadRequest após esgotar as tentativas de protocolo duplicado', async () => {
      const repo = {
        create: jest.fn((data: Partial<QueueEntry>) => makeEntry(data)),
        save: jest.fn(async () => {
          throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
        }),
        createQueryBuilder: jest.fn(() => makeQb()),
      };
      const service = new QueueService(repo as never, new RateLimitService(), {
        emit: jest.fn(),
      } as unknown as QueueEventsService);

      await expect(
        service.createCheckIn(
          { site_id: 'SITE-300', technician_name: 'Cris', request_type: 'Troca' },
          'ip',
        ),
      ).rejects.toThrow('Erro ao registrar solicitação.');
      expect(repo.save).toHaveBeenCalledTimes(5);
    });
  });

  describe('findActive', () => {
    it('retorna apenas entradas com status ativo ordenadas por criação ASC', async () => {
      const rows = [makeEntry(), makeEntry({ id: '...002', status: 'in_review' })];
      const qb = makeQb({ getMany: rows });
      const { service } = buildService(() => qb);

      const result = await service.findActive();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: expect.any(String), status: 'waiting' });
      expect(qb.where).toHaveBeenCalledWith('e.status IN (:...statuses)', {
        statuses: ['waiting', 'in_review'],
      });
      expect(qb.orderBy).toHaveBeenCalledWith('e.createdAt', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('e.id', 'ASC');
    });
  });

  describe('findArchived', () => {
    it('retorna apenas entradas finalizadas ordenadas por atualização DESC', async () => {
      const qb = makeQb({ getMany: [makeEntry({ status: 'approved' })] });
      const { service } = buildService(() => qb);

      await service.findArchived();

      expect(qb.where).toHaveBeenCalledWith('e.status IN (:...statuses)', {
        statuses: ['approved', 'rejected'],
      });
      expect(qb.orderBy).toHaveBeenCalledWith('e.updatedAt', 'DESC');
    });
  });

  describe('findPublicBySiteId (posição na fila)', () => {
    it('calcula posição como (entradas à frente + 1)', async () => {
      const latest = makeEntry();
      const qbs = [makeQb({ getMany: [latest] }), makeQb({ getCount: 3 })];
      const { service } = buildService(() => qbs.shift() ?? makeQb());

      const result = await service.findPublicBySiteId('SITE-100');

      expect(result.position).toBe(4);
      expect(result.entries[0].protocol).toBe('DOC-1234');
      // Não expõe dados pessoais no endpoint público.
      expect(result.entries[0]).not.toHaveProperty('technician_name');
    });

    it('retorna posição null quando o último registro já foi finalizado', async () => {
      const latest = makeEntry({ status: 'approved' satisfies QueueStatus });
      const qb = makeQb({ getMany: [latest] });
      const { service } = buildService(() => qb);

      const result = await service.findPublicBySiteId('SITE-100');

      expect(result.position).toBeNull();
      expect(qb.getCount).not.toHaveBeenCalled();
    });

    it('retorna posição null quando não há registros para o site', async () => {
      const { service } = buildService(() => makeQb({ getMany: [] }));

      const result = await service.findPublicBySiteId('SITE-404');

      expect(result.entries).toEqual([]);
      expect(result.position).toBeNull();
    });

    it('rejeita SITE ID vazio', async () => {
      const { service } = buildService(() => makeQb());
      await expect(service.findPublicBySiteId('   ')).rejects.toThrow(/SITE ID é obrigatório/);
    });
  });

  describe('updateStatus (transições que alimentam o SLA)', () => {
    it('rejeita status inválido', async () => {
      const { service } = buildService(() => makeQb());
      await expect(service.updateStatus('id-1', 'cancelado')).rejects.toThrow(BadRequestException);
    });

    it('lança NotFound quando a solicitação não existe', async () => {
      const { service, repo } = buildService(() => makeQb());
      repo.findOne.mockResolvedValue(null);
      await expect(service.updateStatus('nao-existe', 'approved')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('waiting → in_review registra started_at', async () => {
      const entry = makeEntry({ startedAt: null });
      const { service, repo, events } = buildService(() => makeQb());
      repo.findOne.mockResolvedValue(entry);

      const dto = await service.updateStatus(entry.id, 'in_review');

      expect(dto.started_at).toBeInstanceOf(Date);
      expect(dto.completed_at).toBeNull();
      expect(events.emit).toHaveBeenCalledWith({
        type: 'queue',
        action: 'updated',
        site_id: 'SITE-100',
        protocol: 'DOC-1234',
        status: 'in_review',
      });
    });

    it('in_review → approved preserva started_at e registra completed_at', async () => {
      const startedAt = new Date('2026-08-20T10:05:00Z');
      const entry = makeEntry({ status: 'in_review', startedAt });
      const { service, repo } = buildService(() => makeQb());
      repo.findOne.mockResolvedValue(entry);

      const dto = await service.updateStatus(entry.id, 'approved');

      expect(dto.started_at).toEqual(startedAt);
      expect(dto.completed_at).toBeInstanceOf(Date);
      expect(dto.status).toBe('approved');
    });

    it('voltar para waiting limpa started_at e completed_at', async () => {
      const entry = makeEntry({
        status: 'approved',
        startedAt: new Date('2026-08-20T10:05:00Z'),
        completedAt: new Date('2026-08-20T10:15:00Z'),
      });
      const { service, repo } = buildService(() => makeQb());
      repo.findOne.mockResolvedValue(entry);

      const dto = await service.updateStatus(entry.id, 'waiting');

      expect(dto.started_at).toBeNull();
      expect(dto.completed_at).toBeNull();
      expect(dto.status).toBe('waiting');
    });
  });

  describe('getDashboard (métricas de SLA)', () => {
    it('agrega contagens, converte segundos em minutos e mapeia recentes', async () => {
      const counts: Record<string, number> = {
        default: 7,
        waiting: 3,
        in_review: 1,
        approved: 2,
        rejected: 1,
      };
      const repo = {
        count: jest.fn(async (options?: { where?: { status?: QueueStatus } }) => {
          const status = options?.where?.status;
          return status ? counts[status] : counts.default;
        }),
        createQueryBuilder: jest
          .fn()
          .mockReturnValueOnce(
            makeQb({ getMany: [makeEntry()] }), // recentes
          )
          .mockReturnValueOnce(
            makeQb({ getRawOne: { avgWaitSec: '5400', avgServiceSec: '90' } }), // SLA
          ),
      };
      const service = new QueueService(repo as never, new RateLimitService(), {
        emit: jest.fn(),
      } as unknown as QueueEventsService);

      const dashboard = await service.getDashboard();

      expect(dashboard.total).toBe(7);
      expect(dashboard.waiting).toBe(3);
      expect(dashboard.inReview).toBe(1);
      expect(dashboard.approved).toBe(2);
      expect(dashboard.rejected).toBe(1);
      expect(dashboard.avgWaitMin).toBe(90); // 5400s → 90min
      expect(dashboard.avgServiceMin).toBe(2); // 90s → arredondado para 2min
      expect(dashboard.recent).toHaveLength(1);
      expect(dashboard.recent[0]).toMatchObject({ protocol: 'DOC-1234' });
    });

    it('retorna médias zeradas quando não há atendimentos concluídos', async () => {
      const repo = {
        count: jest.fn().mockResolvedValue(0),
        createQueryBuilder: jest
          .fn()
          .mockReturnValueOnce(makeQb({ getMany: [] }))
          .mockReturnValueOnce(makeQb({ getRawOne: null })),
      };
      const service = new QueueService(repo as never, new RateLimitService(), {
        emit: jest.fn(),
      } as unknown as QueueEventsService);

      const dashboard = await service.getDashboard();

      expect(dashboard.avgWaitMin).toBe(0);
      expect(dashboard.avgServiceMin).toBe(0);
    });
  });
});
