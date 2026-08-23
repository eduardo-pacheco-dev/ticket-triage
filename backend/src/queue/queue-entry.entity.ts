import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type QueueStatus = 'waiting' | 'in_review' | 'approved' | 'rejected';

@Entity('queue_entries')
@Index('queue_entries_site_id_idx', ['siteId'])
export class QueueEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  protocol: string;

  @Column({ name: 'full_name', type: 'varchar', length: 200 })
  fullName: string;

  @Column({ type: 'varchar', length: 200 })
  identifier: string;

  @Column({ name: 'site_id', type: 'varchar', length: 100 })
  siteId: string;

  @Column({ name: 'technician_name', type: 'varchar', length: 200 })
  technicianName: string;

  @Column({ name: 'request_type', type: 'varchar', length: 200 })
  requestType: string;

  @Column({ type: 'varchar', length: 20, default: 'waiting' })
  status: QueueStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;
}
