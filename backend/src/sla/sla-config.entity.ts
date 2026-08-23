import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sla_config')
export class SlaConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'expected_wait_min', type: 'int', default: 60 })
  expectedWaitMin: number;

  @Column({ name: 'expected_service_min', type: 'int', default: 120 })
  expectedServiceMin: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
