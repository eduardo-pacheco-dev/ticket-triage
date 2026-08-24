import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationRead } from './notification-read.entity';
import { QueueEventsService } from '../queue/queue-events.service';

export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  protocol: string | null;
  site_id: string | null;
  status: string | null;
  read: boolean;
  created_at: Date;
}

export interface NotificationsList {
  items: NotificationDto[];
  unreadCount: number;
}

const LIST_LIMIT = 30;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationRead)
    private readonly readsRepository: Repository<NotificationRead>,
    private readonly queueEvents: QueueEventsService,
  ) {}

  async publish(input: {
    title: string;
    body: string;
    protocol?: string;
    siteId?: string;
    status?: string;
  }): Promise<void> {
    try {
      const notification = await this.notificationsRepository.save(
        this.notificationsRepository.create({
          title: input.title,
          body: input.body,
          protocol: input.protocol ?? null,
          siteId: input.siteId ?? null,
          status: input.status ?? null,
        }),
      );
      this.queueEvents.emit({
        type: 'notification',
        action: 'created',
        site_id: notification.siteId ?? undefined,
        protocol: notification.protocol ?? undefined,
        status: notification.status ?? undefined,
      });
    } catch (error) {
      this.logger.warn(`Falha ao publicar notificação: ${String(error)}`);
    }
  }

  async list(userId: string): Promise<NotificationsList> {
    const notifications = await this.notificationsRepository.find({
      order: { createdAt: 'DESC' },
      take: LIST_LIMIT,
    });

    const [unreadCount, reads] = await Promise.all([
      this.countUnread(userId),
      notifications.length
        ? this.readsRepository.find({
            where: {
              userId,
              notificationId: In(notifications.map((n) => n.id)),
            },
          })
        : Promise.resolve([] as NotificationRead[]),
    ]);

    const readIds = new Set(reads.map((r) => r.notificationId));

    return {
      items: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        protocol: n.protocol,
        site_id: n.siteId,
        status: n.status,
        read: readIds.has(n.id),
        created_at: n.createdAt,
      })),
      unreadCount,
    };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notificação não encontrada.');
    await this.readsRepository.save(
      this.readsRepository.create({ notificationId, userId }),
    );
  }

  async markAllRead(userId: string): Promise<void> {
    const unread = await this.notificationsRepository
      .createQueryBuilder('n')
      .select('n.id', 'id')
      .where(
        'NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notification_id = n.id AND r.user_id = :userId)',
        { userId },
      )
      .getRawMany<{ id: string }>();

    if (unread.length === 0) return;

    await this.readsRepository.save(
      unread.map((row) => this.readsRepository.create({ notificationId: row.id, userId })),
    );
  }

  private countUnread(userId: string): Promise<number> {
    return this.notificationsRepository
      .createQueryBuilder('n')
      .where(
        'NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notification_id = n.id AND r.user_id = :userId)',
        { userId },
      )
      .getCount();
  }
}
