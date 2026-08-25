import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ServiceOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ServiceOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

@Entity('service_orders')
@Index('service_orders_status_idx', ['status'])
@Index('service_orders_priority_idx', ['priority'])
export class ServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number', type: 'int', unique: true })
  orderNumber: number;

  @Column({ name: 'client_name', type: 'varchar', length: 200 })
  clientName: string;

  @Column({ name: 'client_contact', type: 'varchar', length: 200, nullable: true })
  clientContact: string | null;

  @Column({ name: 'site_id', type: 'varchar', length: 100, nullable: true })
  siteId: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ServiceOrderStatus;

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority: ServiceOrderPriority;

  @Column({ name: 'assigned_to', type: 'varchar', length: 200, nullable: true })
  assignedTo: string | null;

  @Column({ name: 'scheduled_date', type: 'datetime', nullable: true })
  scheduledDate: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;
}
