import { StationsController } from './stations.controller';

function buildController() {
  const service = {
    findAll: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 }),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findForMap: jest.fn().mockResolvedValue([]),
    findForMapBounds: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };

  const controller = new StationsController(service as never);
  return { controller, service };
}

describe(StationsController.name, () => {
  describe('findAll', () => {
    it('retorna paginação com valores padrão', async () => {
      const { controller, service } = buildController();

      const result = await controller.findAll();

      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 25 });
      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        pageSize: 25,
        search: undefined,
        state: undefined,
      });
    });

    it('passa parâmetros de query para o service', async () => {
      const { controller, service } = buildController();

      await controller.findAll('2', '10', 'teste', 'SP');

      expect(service.findAll).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
        search: 'teste',
        state: 'SP',
      });
    });

    it('trata strings vazias como undefined', async () => {
      const { controller, service } = buildController();

      await controller.findAll('1', '25', '', '');

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        pageSize: 25,
        search: undefined,
        state: undefined,
      });
    });
  });

  describe('findForMap', () => {
    it('chama findForMap sem bounds', async () => {
      const { controller, service } = buildController();

      await controller.findForMap();

      expect(service.findForMap).toHaveBeenCalledWith(undefined);
      expect(service.findForMapBounds).not.toHaveBeenCalled();
    });

    it('chama findForMap com estado', async () => {
      const { controller, service } = buildController();

      await controller.findForMap('RJ');

      expect(service.findForMap).toHaveBeenCalledWith('RJ');
    });

    it('chama findForMapBounds quando todos os bounds são informados', async () => {
      const { controller, service } = buildController();

      await controller.findForMap(undefined, '-24', '-23', '-47', '-46');

      expect(service.findForMapBounds).toHaveBeenCalledWith({
        south: -24,
        north: -23,
        west: -47,
        east: -46,
        state: undefined,
        search: undefined,
      });
    });

    it('passa estado e busca para findForMapBounds', async () => {
      const { controller, service } = buildController();

      await controller.findForMap('SP', '-24', '-23', '-47', '-46', 'teste');

      expect(service.findForMapBounds).toHaveBeenCalledWith({
        south: -24,
        north: -23,
        west: -47,
        east: -46,
        state: 'SP',
        search: 'teste',
      });
    });

    it('usa findForMap quando apenas parte dos bounds é informada', async () => {
      const { controller, service } = buildController();

      await controller.findForMap(undefined, '-24', undefined, undefined, undefined);

      expect(service.findForMap).toHaveBeenCalledWith(undefined);
      expect(service.findForMapBounds).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('delega para o service.findOne', async () => {
      const { controller, service } = buildController();
      service.findOne.mockResolvedValue({ id: 'abc' });

      const result = await controller.findOne('abc');
      expect(result).toEqual({ id: 'abc' });
      expect(service.findOne).toHaveBeenCalledWith('abc');
    });
  });

  describe('create', () => {
    it('delega para o service.create com body e IP', async () => {
      const { controller, service } = buildController();
      service.create.mockResolvedValue({ id: 'new' });

      const body = { name: 'Nova', code: 'NOV-001' };
      const request = {
        headers: {},
        ip: '10.0.0.1',
        socket: { remoteAddress: '10.0.0.1' },
      } as never;

      const result = await controller.create(body as never, request);
      expect(result).toEqual({ id: 'new' });
      expect(service.create).toHaveBeenCalledWith(body, '10.0.0.1');
    });
  });

  describe('update', () => {
    it('delega para o service.update com id e body', async () => {
      const { controller, service } = buildController();
      service.update.mockResolvedValue({ id: 'abc', name: 'X' });

      const result = await controller.update('abc', { name: 'X' } as never);
      expect(result).toEqual({ id: 'abc', name: 'X' });
      expect(service.update).toHaveBeenCalledWith('abc', { name: 'X' });
    });
  });

  describe('remove', () => {
    it('delega para o service.remove', async () => {
      const { controller, service } = buildController();

      await controller.remove('abc');
      expect(service.remove).toHaveBeenCalledWith('abc');
    });
  });
});
