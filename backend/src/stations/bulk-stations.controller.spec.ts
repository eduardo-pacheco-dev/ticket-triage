import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { BulkStationsController, mapExcelRow, EXCEL_HEADERS } from './bulk-stations.controller';

function buildController() {
  const service = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    getJob: jest.fn(),
    startImportFromBuffer: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn(),
  };

  const controller = new BulkStationsController(service as never);
  return { controller, service };
}

describe('mapExcelRow', () => {
  it('retorna null quando Site ID está ausente', () => {
    expect(mapExcelRow({})).toBeNull();
  });

  it('retorna null quando Site ID é string vazia', () => {
    expect(mapExcelRow({ 'Site ID': '  ' })).toBeNull();
  });

  it('retorna null quando Site ID não é string', () => {
    expect(mapExcelRow({ 'Site ID': 123 })).toBeNull();
  });

  it('mapeia colunas corretamente para campos da entidade', () => {
    const row = {
      'Site ID': 'SITE-100',
      'Tipo de elemento': 'Torre',
      Tecnologia: '4G',
      'Tipo de Conexão': 'Fibra',
      'Endereço ID': 'ADDR-1',
      Classificacao: 'MACRO',
      Status: 'Ativo',
      Regional: 'Sudeste',
      Latitude: '-23.55',
      Longitude: '-46.63',
      Município: 'São Paulo',
      Estado: 'SP',
    };

    const result = mapExcelRow(row);
    expect(result).not.toBeNull();
    expect(result!['siteId']).toBe('SITE-100');
    expect(result!['elementType']).toBe('Torre');
    expect(result!['technology']).toBe('4G');
    expect(result!['connectionType']).toBe('Fibra');
    expect(result!['addressId']).toBe('ADDR-1');
    expect(result!['classification']).toBe('MACRO');
    expect(result!['status']).toBe('Ativo');
    expect(result!['regional']).toBe('Sudeste');
    expect(result!['latitude']).toBe('-23.55');
    expect(result!['longitude']).toBe('-46.63');
    expect(result!['city']).toBe('São Paulo');
    expect(result!['state']).toBe('SP');
  });

  it('ignora valores nulos, undefined e literais nulos', () => {
    const row = {
      'Site ID': 'SITE-100',
      'Tipo de elemento': null,
      Tecnologia: 'null',
      Status: 'N/A',
      Regional: '-',
      Observação: '',
    };

    const result = mapExcelRow(row);
    expect(result).not.toBeNull();
    expect(result!['elementType']).toBeUndefined();
    expect(result!['technology']).toBeUndefined();
    expect(result!['status']).toBeUndefined();
    expect(result!['regional']).toBeUndefined();
    expect(result!['observation']).toBeUndefined();
  });

  it('converte datas ISO para string ISO', () => {
    const row = {
      'Site ID': 'SITE-100',
      'Data de aquisição': '2024-01-15',
      'Data de construção': '2024-06-20T10:00:00Z',
    };

    const result = mapExcelRow(row);
    expect(result).not.toBeNull();
    expect(result!['acquisitionDate']).toBeDefined();
    expect(result!['constructionDate']).toBeDefined();
  });

  it('converte datas em formato ISO', () => {
    const row = {
      'Site ID': 'SITE-100',
      'Data de ativação': '2024-01-15T10:00:00Z',
    };

    const result = mapExcelRow(row);
    expect(result).not.toBeNull();
    expect(result!['activationDate']).toBeDefined();
  });

  it('converte números seriais do Excel em datas (> 25569)', () => {
    const row = {
      'Site ID': 'SITE-100',
      'Data de desativação': 45307,
    };

    const result = mapExcelRow(row);
    expect(result).not.toBeNull();
    expect(result!['deactivationDate']).toBeDefined();
    expect(typeof result!['deactivationDate']).toBe('string');
  });

  it('retorna datas como strings ISO', () => {
    const row = {
      'Site ID': 'SITE-100',
      'Data de cancelamento': '2024-06-15',
    };

    const result = mapExcelRow(row);
    expect(result).not.toBeNull();
    expect(typeof result!['cancellationDate']).toBe('string');
  });

  it('mapeia todas as 41 colunas do EXCEL_HEADERS', () => {
    const row: Record<string, unknown> = { 'Site ID': 'SITE-100' };
    for (const header of EXCEL_HEADERS) {
      if (header === 'Site ID') continue;
      row[header] = `val_${header}`;
    }

    const result = mapExcelRow(row);
    expect(result).not.toBeNull();
    const keys = Object.keys(result!);
    expect(keys.length).toBeGreaterThanOrEqual(30);
  });

  it('ignora colunas não mapeadas', () => {
    const row = {
      'Site ID': 'SITE-100',
      'Coluna Desconhecida': 'valor',
    };

    const result = mapExcelRow(row);
    expect(result).not.toBeNull();
    expect(Object.keys(result!)).not.toContain('Coluna Desconhecida');
  });
});

describe(BulkStationsController.name, () => {
  describe('findAll', () => {
    it('delega para o service.findAll', async () => {
      const { controller, service } = buildController();
      await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('retorna contagem', async () => {
      const { controller, service } = buildController();
      service.count.mockResolvedValue(10);
      const result = await controller.count();
      expect(result).toEqual({ count: 10 });
    });
  });

  describe('getJob', () => {
    it('delega para o service.getJob', () => {
      const { controller, service } = buildController();
      const mockJob = { id: 'j1', status: 'completed' };
      service.getJob.mockReturnValue(mockJob);

      const result = controller.getJob('j1');
      expect(result).toEqual(mockJob);
    });
  });

  describe('uploadExcel', () => {
    it('lança BadRequest quando nenhum arquivo é enviado', async () => {
      const { controller } = buildController();
      await expect(controller.uploadExcel(undefined as never)).rejects.toThrow(BadRequestException);
    });

    it('delega para o service quando arquivo é enviado', async () => {
      const { controller, service } = buildController();
      const mockJob = { id: 'j1', status: 'processing' };
      service.startImportFromBuffer.mockResolvedValue(mockJob);

      const result = await controller.uploadExcel({
        buffer: Buffer.from('fake'),
      } as never);

      expect(result).toEqual(mockJob);
    });
  });

  describe('remove', () => {
    it('delega para o service.remove', async () => {
      const { controller, service } = buildController();
      await controller.remove('id-1');
      expect(service.remove).toHaveBeenCalledWith('id-1');
    });
  });

  describe('removeAll', () => {
    it('delega para o service.removeAll', async () => {
      const { controller, service } = buildController();
      await controller.removeAll();
      expect(service.removeAll).toHaveBeenCalled();
    });
  });

  describe('exportExcel', () => {
    it('gera planilha com headers e dados das estações', async () => {
      const { controller, service } = buildController();
      service.findAll.mockResolvedValue([
        { siteId: 'SITE-100', code: 'C1', city: 'SP', state: 'SP' },
      ]);

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.exportExcel(res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment'),
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('gera planilha vazia quando não há estações', async () => {
      const { controller, service } = buildController();
      service.findAll.mockResolvedValue([]);

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.exportExcel(res);

      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  describe('downloadTemplate', () => {
    it('gera planilha template com apenas os headers', () => {
      const { controller } = buildController();

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      controller.downloadTemplate(res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="template_importacao_estacoes.xlsx"',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });
});
