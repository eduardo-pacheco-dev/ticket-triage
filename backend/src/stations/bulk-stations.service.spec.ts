import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BulkStationsService } from './bulk-stations.service';
import type { Station } from './station.entity';
import { RateLimitService } from '../common/rate-limit.service';

jest.mock('node:fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('xlsx', () => {
  const sheetToJson = jest.fn().mockReturnValue([]);
  return {
    readFile: jest.fn().mockReturnValue({ SheetNames: [], Sheets: {} }),
    utils: {
      sheet_to_json: sheetToJson,
    },
    __sheetToJson: sheetToJson,
  };
});

const XLSX = jest.requireMock('xlsx') as {
  readFile: jest.Mock;
  __sheetToJson: jest.Mock;
};

function makeStation(overrides: Partial<Station> = {}): Station {
  const base: Station = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'SITE-1001',
    code: 'SITE-1001',
    address: null,
    city: 'São Paulo',
    state: 'SP',
    phone: null,
    email: null,
    responsible: null,
    notes: null,
    siteId: 'SITE-1001',
    elementType: 'Torre',
    technology: '4G',
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
    latitude: null,
    longitude: null,
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
    attachments: [],
  };
  return Object.assign(base, overrides);
}

function buildService() {
  const qbChain = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ raw: { affectedRows: 1 } }),
  };

  const repo = {
    find: jest.fn<Promise<Station[]>, []>(async () => []),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((data: Partial<Station>) => makeStation(data)),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    clear: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(() => qbChain),
  };

  const service = new BulkStationsService(repo as never, new RateLimitService());

  return { service, repo, qbChain };
}

describe(BulkStationsService.name, () => {
  describe('findAll', () => {
    it('retorna estações ordenadas por siteId', async () => {
      const { service, repo } = buildService();
      repo.find.mockResolvedValue([makeStation()]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(repo.find).toHaveBeenCalledWith({ order: { siteId: 'ASC' }, take: 5000 });
    });
  });

  describe('findOne', () => {
    it('retorna estação quando existe', async () => {
      const station = makeStation();
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(station);

      const result = await service.findOne(station.id);
      expect(result.id).toBe(station.id);
    });

    it('lança NotFoundException quando não existe', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('count', () => {
    it('retorna contagem total', async () => {
      const { service, repo } = buildService();
      repo.count.mockResolvedValue(42);

      const result = await service.count();
      expect(result).toBe(42);
    });
  });

  describe('getJob', () => {
    it('lança NotFoundException quando job não existe', () => {
      const { service } = buildService();
      expect(() => service.getJob('inexistente')).toThrow(NotFoundException);
    });
  });

  describe('startImportFromBuffer', () => {
    it('cria job com estrutura correta', async () => {
      (XLSX.readFile as jest.Mock).mockReturnValue({
        SheetNames: ['Stations'],
        Sheets: { Stations: {} },
      });
      XLSX.__sheetToJson.mockReturnValue([{ 'Site ID': 'S1' }]);

      const { service } = buildService();
      const buffer = Buffer.from('fake');

      const job = await service.startImportFromBuffer(buffer);

      expect(job.id).toBeDefined();
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(['processing', 'completed', 'failed']).toContain(job.status);
    });

    it('lança BadRequest quando rate limit excedido', async () => {
      const { service } = buildService();
      const buffer = Buffer.from('fake');

      for (let i = 0; i < 30; i++) {
        await service.startImportFromBuffer(buffer);
      }
      await expect(service.startImportFromBuffer(buffer)).rejects.toThrow(BadRequestException);
    });

    it('processa arquivo vazio e marca job como completed', async () => {
      (XLSX.readFile as jest.Mock).mockReturnValue({ SheetNames: [], Sheets: {} });

      const { service } = buildService();
      const buffer = Buffer.from('fake');

      const job = await service.startImportFromBuffer(buffer);

      await new Promise((r) => setTimeout(r, 50));

      expect(job.status).toBe('failed');
      expect(job.errorMessages).toContain('Planilha vazia.');
    });

    it('processa linhas e insere em batches', async () => {
      const sheetToJson = XLSX.__sheetToJson as jest.Mock;
      sheetToJson.mockReturnValue([
        { 'Site ID': 'S1', name: 'Est1' },
        { 'Site ID': 'S2', name: 'Est2' },
      ]);
      (XLSX.readFile as jest.Mock).mockReturnValue({
        SheetNames: ['Stations'],
        Sheets: { Stations: {} },
      });

      const { service, qbChain } = buildService();
      const buffer = Buffer.from('fake');

      const job = await service.startImportFromBuffer(buffer);
      await new Promise((r) => setTimeout(r, 50));

      expect(qbChain.execute).toHaveBeenCalled();
      expect(job.status).toBe('completed');
    });

    it('marca job como failed quando todos os registros falham', async () => {
      const sheetToJson = XLSX.__sheetToJson as jest.Mock;
      sheetToJson.mockReturnValue([
        { 'Site ID': 'S1', name: 'Est1' },
        { 'Site ID': 'S2', name: 'Est2' },
      ]);
      (XLSX.readFile as jest.Mock).mockReturnValue({
        SheetNames: ['Stations'],
        Sheets: { Stations: {} },
      });

      const { service, qbChain } = buildService();
      qbChain.execute.mockRejectedValue(new Error('db error'));

      const job = await service.startImportFromBuffer(Buffer.from('fake'));
      await new Promise((r) => setTimeout(r, 50));

      expect(job.status).toBe('failed');
    });

    it('marca job como completed quando há mistura de sucesso e erro', async () => {
      const sheetToJson = XLSX.__sheetToJson as jest.Mock;
      sheetToJson.mockReturnValue([
        { 'Site ID': 'S1', name: 'Est1' },
        { 'Site ID': 'S2', name: 'Est2' },
      ]);
      (XLSX.readFile as jest.Mock).mockReturnValue({
        SheetNames: ['Stations'],
        Sheets: { Stations: {} },
      });

      const { service, qbChain } = buildService();
      qbChain.execute.mockResolvedValueOnce({ raw: { affectedRows: 1 } });

      const job = await service.startImportFromBuffer(Buffer.from('fake'));
      await new Promise((r) => setTimeout(r, 50));

      expect(job.status).toBe('completed');
      expect(job.inserted).toBe(1);
      expect(job.skipped).toBe(1);
    });

    it('marca job como failed quando XLSX.readFile lança exceção', async () => {
      (XLSX.readFile as jest.Mock).mockImplementation(() => {
        throw new Error(' arquivo corrompido');
      });

      const { service } = buildService();

      const job = await service.startImportFromBuffer(Buffer.from('fake'));
      await new Promise((r) => setTimeout(r, 50));

      expect(job.status).toBe('failed');
      expect(job.errorMessages).toContain(' arquivo corrompido');
    });

    it('pula linhas sem Site ID', async () => {
      const sheetToJson = XLSX.__sheetToJson as jest.Mock;
      sheetToJson.mockReturnValue([{ name: 'SemSiteId' }, { 'Site ID': 'S1', name: 'ComSiteId' }]);
      (XLSX.readFile as jest.Mock).mockReturnValue({
        SheetNames: ['Stations'],
        Sheets: { Stations: {} },
      });

      const { service } = buildService();

      const job = await service.startImportFromBuffer(Buffer.from('fake'));
      await new Promise((r) => setTimeout(r, 50));

      expect(job.total).toBe(1);
    });

    it('processa batch grande (>= 2000 linhas)', async () => {
      const rows = Array.from({ length: 2500 }, (_, i) => ({
        'Site ID': `S${i}`,
        name: `Est${i}`,
      }));
      const sheetToJson = XLSX.__sheetToJson as jest.Mock;
      sheetToJson.mockReturnValue(rows);
      (XLSX.readFile as jest.Mock).mockReturnValue({
        SheetNames: ['Stations'],
        Sheets: { Stations: {} },
      });

      const { service, qbChain } = buildService();

      const job = await service.startImportFromBuffer(Buffer.from('fake'));
      await new Promise((r) => setTimeout(r, 100));

      expect(qbChain.execute).toHaveBeenCalledTimes(2);
      expect(job.total).toBe(2500);
    });
  });

  describe('remove', () => {
    it('exclui estação existente', async () => {
      const station = makeStation();
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(station);

      await service.remove(station.id);
      expect(repo.delete).toHaveBeenCalledWith(station.id);
    });

    it('lança NotFoundException quando não existe', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAll', () => {
    it('limpa todas as estações', async () => {
      const { service, repo } = buildService();
      await service.removeAll();
      expect(repo.clear).toHaveBeenCalled();
    });
  });
});
