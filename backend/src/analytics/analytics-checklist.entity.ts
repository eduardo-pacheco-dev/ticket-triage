import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AnalyticsChecklistStatus = 'Aprovado' | 'Rejeitado' | 'Pendente' | 'Em Andamento';

@Entity('analytics_checklists')
@Index('analytics_checklists_status_idx', ['status'])
@Index('analytics_checklists_site_id_idx', ['siteId'])
@Index('analytics_checklists_project_idx', ['project'])
export class AnalyticsChecklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project', type: 'varchar', length: 300 })
  project: string;

  @Column({ name: 'regional', type: 'varchar', length: 200, nullable: true })
  regional: string | null;

  @Column({ name: 'estado', type: 'varchar', length: 2, nullable: true })
  estado: string | null;

  @Column({ name: 'site_id', type: 'varchar', length: 100, nullable: true })
  siteId: string | null;

  @Column({ name: 'oc', type: 'varchar', length: 100, nullable: true })
  oc: string | null;

  @Column({ name: 'smp_name', type: 'varchar', length: 300, nullable: true })
  smpName: string | null;

  @Column({ name: 'scope', type: 'varchar', length: 300, nullable: true })
  scope: string | null;

  @Column({ name: 'smp_id', type: 'varchar', length: 100, nullable: true })
  smpId: string | null;

  @Column({ name: 'module', type: 'varchar', length: 200, nullable: true })
  module: string | null;

  @Column({ name: 'module_id', type: 'varchar', length: 100, nullable: true })
  moduleId: string | null;

  @Column({ name: 'implementation_vendor', type: 'varchar', length: 200, nullable: true })
  implementationVendor: string | null;

  @Column({ name: 'module_start_date', type: 'datetime', nullable: true })
  moduleStartDate: Date | null;

  @Column({ name: 'section', type: 'varchar', length: 200, nullable: true })
  section: string | null;

  @Column({ name: 'checklist_item', type: 'varchar', length: 500, nullable: true })
  checklistItem: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'Pendente' })
  status: AnalyticsChecklistStatus;

  @Column({ name: 'rejection_comment', type: 'text', nullable: true })
  rejectionComment: string | null;

  @Column({ name: 'rejection_date', type: 'datetime', nullable: true })
  rejectionDate: Date | null;

  @Column({ name: 'modified_by', type: 'varchar', length: 200, nullable: true })
  modifiedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
