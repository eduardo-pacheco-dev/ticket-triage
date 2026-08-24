import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import type { Notification } from './notification.entity';

type QbOverrides = {
  getCount?: number;
  getRawMany?: Array<{ id: string }>;
};

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  const base: Notification = {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Nova solicitação',
    body: 'SITE-100 • Instalação • Ana Souza',
    protocol: 'DOC-1234',
    siteId: 'SITE-100',
    status: 'waiting',
    createdAt: new Date('2026-08-20T10:00:00Z'),
  };
  return Object.assign(base, overrides);
}

function buildService(qbOverrides: QbOverrides = {}) {
  const qb = {
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(qbOverrides.getCount ?? 0),
    getRawMany: jest.fn().mockResolvedValue(qbOverrides.getRawMany ?? []),
  };
  const notificationsRepo = {
    create: jest.fn((data: Partial<Notification>) => makeNotification(data)),
    save: jest.fn(async (notification: Notification) => notification),
    find: jest.fn(async () => [] as Notification[]),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };
  const readsRepo = {
    create: jest.fn((data: { notificationId: string; userId: string }) => ({
      readAt: new Date('2026-08-20T11:00:00Z'),
      ...data,
    })),
    save: jest.fn(async (rows: unknown) => rows),
    find: jest.fn(
      async (_criteria?: unknown): Promise<Array<{ notificationId: string; userId: string; readAt: Date }>> => [],
    ),
  };
  const events = { emit: jest.fn() };
  const service = new NotificationsService(
    notificationsRepo as never,
    readsRepo as never,
    events as never,
  );
  return { service, notificationsRepo, readsRepo, events, qb };
}

describe('NotificationsService', () => {
  describe('publish', () => {
    it('salva a notificação e emite evento SSE', async () => {
      const { service, notificationsRepo, events } = buildService();

      await service.publish({
        title: 'Nova solicitação',
        body: 'SITE-100 • Instalação • Ana Souza',
        protocol: 'DOC-1234',
        siteId: 'SITE-100',
        status: 'waiting',
      });

      expect(notificationsRepo.save).toHaveBeenCalledTimes(1);
      expect(events.emit).toHaveBeenCalledWith({
        type: 'notification',
        action: 'created',
        site_id: 'SITE-100',
        protocol: 'DOC-1234',
        status: 'waiting',
        title: 'Nova solicitação',
        body: 'SITE-100 • Instalação • Ana Souza',
      });
    });

    it('engole falha de persistência sem quebrar o fluxo chamador', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { service, notificationsRepo, events } = buildService();
      notificationsRepo.save.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.publish({ title: 'T', body: 'B' }),
      ).resolves.toBeUndefined();
      expect(events.emit).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('list', () => {
    it('marca itens lidos conforme os registros do usuário e expõe unreadCount', async () => {
      const unread = makeNotification({ id: '00000000-0000-4000-8000-000000000002' });
      const read = makeNotification({ id: '00000000-0000-4000-8000-000000000001' });
      const { service, notificationsRepo, readsRepo, qb } = buildService({ getCount: 1 });
      notificationsRepo.find.mockResolvedValue([read, unread]);
      readsRepo.find.mockResolvedValue([
        { notificationId: read.id, userId: 'user-1', readAt: new Date() },
      ]);

      const result = await service.list('user-1');

      expect(qb.getCount).toHaveBeenCalledTimes(1);
      const readsCall = readsRepo.find.mock.calls[0][0] as {
        where: { userId: string; notificationId: { value: string[] } };
      };
      expect(readsCall.where.userId).toBe('user-1');
      expect(readsCall.where.notificationId.value).toEqual([read.id, unread.id]);
      expect(result.unreadCount).toBe(1);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({ id: read.id, read: true });
      expect(result.items[1]).toMatchObject({ id: unread.id, read: false });
    });

    it('consulta apenas contagem quando não há notificações', async () => {
      const { service, readsRepo } = buildService({ getCount: 0 });

      const result = await service.list('user-1');

      expect(readsRepo.find).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
      expect(result.unreadCount).toBe(0);
    });
  });

  describe('markRead', () => {
    it('lança NotFound para id inexistente', async () => {
      const { service, notificationsRepo } = buildService();
      notificationsRepo.findOne.mockResolvedValue(null);

      await expect(service.markRead('user-1', 'nao-existe')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('registra a leitura do usuário', async () => {
      const { service, notificationsRepo, readsRepo } = buildService();
      notificationsRepo.findOne.mockResolvedValue(makeNotification());

      await service.markRead('user-1', '00000000-0000-4000-8000-000000000001');

      expect(readsRepo.create).toHaveBeenCalledWith({
        notificationId: '00000000-0000-4000-8000-000000000001',
        userId: 'user-1',
      });
      expect(readsRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('markAllRead', () => {
    it('registra leitura apenas das não lidas', async () => {
      const ids = [
        { id: '00000000-0000-4000-8000-000000000002' },
        { id: '00000000-0000-4000-8000-000000000003' },
      ];
      const { service, readsRepo, qb } = buildService({ getRawMany: ids });

      await service.markAllRead('user-1');

      expect(qb.getRawMany).toHaveBeenCalledTimes(1);
      expect(readsRepo.create).toHaveBeenCalledTimes(2);
      expect(readsRepo.create).toHaveBeenCalledWith({
        notificationId: '00000000-0000-4000-8000-000000000002',
        userId: 'user-1',
      });
    });

    it('não grava nada quando tudo já foi lido', async () => {
      const { service, readsRepo } = buildService({ getRawMany: [] });

      await service.markAllRead('user-1');

      expect(readsRepo.save).not.toHaveBeenCalled();
    });
  });
});
