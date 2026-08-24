import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('notification_reads')
export class NotificationRead {
  @PrimaryColumn({ name: 'notification_id', type: 'uuid' })
  notificationId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'read_at' })
  readAt: Date;
}
