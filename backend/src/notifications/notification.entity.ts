import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notifications')
@Index('notifications_created_at_idx', ['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 400 })
  body: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  protocol: string | null;

  @Column({ name: 'site_id', type: 'varchar', length: 100, nullable: true })
  siteId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  status: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
