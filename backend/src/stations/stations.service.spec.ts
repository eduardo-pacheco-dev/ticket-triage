import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StationsService } from './stations.service';
import type { Station } from './station.entity';
import { RateLimitService } from '../common/rate-limit.service';
import { QueueEventsService } from '../queue/queue-events.service';

type QbOverrides = {
  getMany?: Station[];
  getManyAndCount?: [Station[], number];
  getCount?: number;
};

function makeQb(overrides: QbOverrides = {}) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(overrides.getMany ?? []),
    getManyAndCount: jest
      .fn()
      .mockResolvedValue(overrides.getManyAndCount ?? [overrides.getMany ?? [], 0]),
    getCount: jest.fn().mockResolvedValue(overrides.getCount ?? 0),
  };
}

function makeStation(overrides: Partial<Station> = {}): Station {
  const base: Station = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Torre Teste',
    code: 'TTEST-001',
    address: null,
    city: 'São Paulo',
    state: 'SP',
    phone: null,
    email: null,
    responsible: null,
    notes: null,
    siteId: 'SITE-1001',
    elementType: null,
    technology: null,
    connectionType: null,
    addressId: null,
    classification: null,
    acquisitionDate: null,
    constructionDate: null,
    activationDate: null,
    deactivationDate: null,
    cancellationDate: null,
    areaContractType: null,
    areaHolder: null,
    infraContractType: null,
    infraHolder: null,
    infraType: null,
    evType: null,
    evProvider: null,
    observation: null,
    justification: null,
    streetType: null,
    street: null,
    number: null,
    complement: null,
    neighborhood: null,
    zipCode: null,
    regional: null,
    latitude: '-23.5505',
    longitude: '-46.6340',
    status: 'Ativo',
    towerType: null,
    aevNominal: null,
    groundArea: null,
    structureHeight: null,
    stationId: null,
    complexOrder: null,
    thqObservation: null,
    situation: null,
    ots: null,
    createdAt: new Date('2026-08-20T10:00:00Z'),
    updatedAt: new Date('2026-08-20T10:00:00Z'),
  };
  return Object.assign(base, overrides);
}

function buildService(qbFactory?: (...args: unknown[]) => ReturnType<typeof makeQb>) {
  const repo = {
    create: jest.fn((data: Partial<Station>) => makeStation(data)),
    save: jest.fn(async (station: Station) => station),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  if (qbFactory) {
    repo.createQueryBuilder.mockImplementation(qbFactory);
  }

  const events = { emit: jest.fn() };
  const service = new StationsService(
    repo as never,
    new RateLimitService(),
    events as unknown as QueueEventsService,
  );
  return { service, repo, events };
}

describe(StationsService.name, () => {
  describe('findAll', () => {
    it('retorna estações paginadas com total', async () => {
      const stations = [makeStation(), makeStation({ id: '...002', name: 'Estação 2' })];
      const qb = makeQb({ getManyAndCount: [stations, 25] });
      const { service } = buildService(() => qb);

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(qb.orderBy).toHaveBeenCalledWith('s.name', 'ASC');
    });

    it('aplica filtro de busca com LIKE em múltiplos campos', async () => {
      const qb = makeQb({ getManyAndCount: [[], 0] });
      const { service } = buildService(() => qb);

      await service.findAll({ page: 1, pageSize: 25, search: 'alphaville' });

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('s.name LIKE :t'), {
        t: '%alphaville%',
      });
    });

    it('aplica filtro de estado', async () => {
      const qb = makeQb({ getManyAndCount: [[], 0] });
      const { service } = buildService(() => qb);

      await service.findAll({ page: 1, pageSize: 25, state: 'RJ' });

      expect(qb.andWhere).toHaveBeenCalledWith('s.state = :state', { state: 'RJ' });
    });

    it('normaliza page e pageSize para limites válidos', async () => {
      const qb = makeQb({ getManyAndCount: [[], 0] });
      const { service } = buildService(() => qb);

      await service.findAll({ page: 0, pageSize: 0 });
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(25);

      await service.findAll({ page: 1, pageSize: 200 });
      expect(qb.take).toHaveBeenCalledWith(100);
    });

    it('combina busca e estado', async () => {
      const qb = makeQb({ getManyAndCount: [[], 0] });
      const { service } = buildService(() => qb);

      await service.findAll({ page: 2, pageSize: 5, search: 'teste', state: 'SP' });

      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(qb.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('findOne', () => {
    it('retorna a estação quando existe', async () => {
      const station = makeStation();
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(station);

      const result = await service.findOne(station.id);
      expect(result).toMatchObject({ id: station.id, name: 'Torre Teste' });
    });

    it('lança NotFoundException quando não existe', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('cria estação e emite evento', async () => {
      const { service, repo, events } = buildService();

      const result = await service.create({ name: 'Nova Torre', code: 'NTORR-001' }, '10.0.0.1');

      expect(result.name).toBe('Nova Torre');
      expect(repo.create).toHaveBeenCalledWith({ name: 'Nova Torre', code: 'NTORR-001' });
      expect(repo.save).toHaveBeenCalled();
      expect(events.emit).toHaveBeenCalledWith({ type: 'stations', action: 'created' });
    });

    it('lança BadRequest quando o código já existe (ER_DUP_ENTRY)', async () => {
      const { service, repo } = buildService();
      repo.save.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));

      await expect(
        service.create({ name: 'Duplicada', code: 'DUP-001' }, '10.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequest genérico para outros erros', async () => {
      const { service, repo } = buildService();
      repo.save.mockRejectedValue(new Error('db down'));

      await expect(service.create({ name: 'Erro', code: 'ERR-001' }, '10.0.0.1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('bloqueia criação quando rate limit é excedido', async () => {
      const { service } = buildService();
      for (let i = 0; i < 30; i++) {
        await service.create({ name: `T${i}`, code: `C${i}` }, '10.0.0.1');
      }
      await expect(
        service.create({ name: 'Bloqueada', code: 'BLOCK' }, '10.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('atualiza campos e emite evento', async () => {
      const existing = makeStation();
      const { service, repo, events } = buildService();
      repo.findOne.mockResolvedValue(existing);

      const result = await service.update(existing.id, { name: 'Atualizada' });

      expect(result.name).toBe('Atualizada');
      expect(events.emit).toHaveBeenCalledWith({ type: 'stations', action: 'updated' });
    });

    it('lança NotFoundException quando não existe', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(null);

      await expect(service.update('nao-existe', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lança BadRequest para ER_DUP_ENTRY na atualização', async () => {
      const existing = makeStation();
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));

      await expect(service.update(existing.id, { code: 'DUP' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança BadRequest genérico para outros erros na atualização', async () => {
      const existing = makeStation();
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockRejectedValue(new Error('fail'));

      await expect(service.update(existing.id, { name: 'X' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('findForMap', () => {
    it('retorna coordenadas filtrando por latitude e longitude não nulos', async () => {
      const stations = [makeStation()];
      const qb = makeQb({ getMany: stations });
      const { service } = buildService(() => qb);

      const result = await service.findForMap();

      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('s.latitude IS NOT NULL'),
        expect.any(Object),
      );
    });

    it('filtra por estado quando informado', async () => {
      const qb = makeQb({ getMany: [] });
      const { service } = buildService(() => qb);

      await service.findForMap('RJ');

      expect(qb.andWhere).toHaveBeenCalledWith('s.state = :state', { state: 'RJ' });
    });
  });

  describe('findForMapBounds', () => {
    it('filtra por bounds geográficos e retorna contagem', async () => {
      const stations = [makeStation()];
      const qb = makeQb({ getMany: stations, getCount: 1 });
      const { service } = buildService(() => qb);

      const result = await service.findForMapBounds({
        south: -24,
        north: -23,
        west: -47,
        east: -46,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('BETWEEN :south AND :north'),
        expect.objectContaining({ south: -24, north: -23 }),
      );
    });

    it('adiciona filtro de estado quando informado', async () => {
      const qb = makeQb({ getMany: [], getCount: 0 });
      const { service } = buildService(() => qb);

      await service.findForMapBounds({
        south: -24,
        north: -23,
        west: -47,
        east: -46,
        state: 'SP',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('s.state = :state', { state: 'SP' });
    });

    it('adiciona filtro de busca quando informado', async () => {
      const qb = makeQb({ getMany: [], getCount: 0 });
      const { service } = buildService(() => qb);

      await service.findForMapBounds({
        south: -24,
        north: -23,
        west: -47,
        east: -46,
        search: 'teste',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('s.name LIKE :t'), {
        t: '%teste%',
      });
    });
  });

  describe('remove', () => {
    it('exclui estação existente e emite evento', async () => {
      const existing = makeStation();
      const { service, repo, events } = buildService();
      repo.findOne.mockResolvedValue(existing);
      repo.delete.mockResolvedValue({ affected: 1 });

      await service.remove(existing.id);

      expect(repo.delete).toHaveBeenCalledWith(existing.id);
      expect(events.emit).toHaveBeenCalledWith({ type: 'stations', action: 'deleted' });
    });

    it('lança NotFoundException quando não existe', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });
});
