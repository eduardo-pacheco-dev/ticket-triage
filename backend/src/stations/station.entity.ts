import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stations')
@Index('stations_code_idx', ['code'], { unique: true })
@Index('stations_site_id_idx', ['siteId'])
@Index('stations_status_idx', ['status'])
@Index('stations_regional_idx', ['regional'])
export class Station {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  state: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ name: 'responsible', type: 'varchar', length: 200, nullable: true })
  responsible: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'site_id', type: 'varchar', length: 100, nullable: true })
  siteId: string | null;

  @Column({ name: 'element_type', type: 'varchar', length: 100, nullable: true })
  elementType: string | null;

  @Column({ name: 'technology', type: 'varchar', length: 50, nullable: true })
  technology: string | null;

  @Column({ name: 'connection_type', type: 'varchar', length: 100, nullable: true })
  connectionType: string | null;

  @Column({ name: 'address_id', type: 'varchar', length: 100, nullable: true })
  addressId: string | null;

  @Column({ name: 'classification', type: 'varchar', length: 100, nullable: true })
  classification: string | null;

  @Column({ name: 'acquisition_date', type: 'datetime', nullable: true })
  acquisitionDate: Date | null;

  @Column({ name: 'construction_date', type: 'datetime', nullable: true })
  constructionDate: Date | null;

  @Column({ name: 'activation_date', type: 'datetime', nullable: true })
  activationDate: Date | null;

  @Column({ name: 'deactivation_date', type: 'datetime', nullable: true })
  deactivationDate: Date | null;

  @Column({ name: 'cancellation_date', type: 'datetime', nullable: true })
  cancellationDate: Date | null;

  @Column({ name: 'area_contract_type', type: 'varchar', length: 100, nullable: true })
  areaContractType: string | null;

  @Column({ name: 'area_holder', type: 'varchar', length: 200, nullable: true })
  areaHolder: string | null;

  @Column({ name: 'infra_contract_type', type: 'varchar', length: 100, nullable: true })
  infraContractType: string | null;

  @Column({ name: 'infra_holder', type: 'varchar', length: 200, nullable: true })
  infraHolder: string | null;

  @Column({ name: 'infra_type', type: 'varchar', length: 100, nullable: true })
  infraType: string | null;

  @Column({ name: 'ev_type', type: 'varchar', length: 100, nullable: true })
  evType: string | null;

  @Column({ name: 'ev_provider', type: 'varchar', length: 200, nullable: true })
  evProvider: string | null;

  @Column({ name: 'observation', type: 'text', nullable: true })
  observation: string | null;

  @Column({ name: 'justification', type: 'text', nullable: true })
  justification: string | null;

  @Column({ name: 'street_type', type: 'varchar', length: 50, nullable: true })
  streetType: string | null;

  @Column({ name: 'street', type: 'varchar', length: 300, nullable: true })
  street: string | null;

  @Column({ name: 'number', type: 'varchar', length: 20, nullable: true })
  number: string | null;

  @Column({ name: 'complement', type: 'varchar', length: 200, nullable: true })
  complement: string | null;

  @Column({ name: 'neighborhood', type: 'varchar', length: 200, nullable: true })
  neighborhood: string | null;

  @Column({ name: 'zip_code', type: 'varchar', length: 10, nullable: true })
  zipCode: string | null;

  @Column({ name: 'regional', type: 'varchar', length: 50, nullable: true })
  regional: string | null;

  @Column({ name: 'latitude', type: 'varchar', length: 30, nullable: true })
  latitude: string | null;

  @Column({ name: 'longitude', type: 'varchar', length: 30, nullable: true })
  longitude: string | null;

  @Column({ name: 'status', type: 'varchar', length: 50, nullable: true })
  status: string | null;

  @Column({ name: 'tower_type', type: 'varchar', length: 100, nullable: true })
  towerType: string | null;

  @Column({ name: 'aev_nominal', type: 'varchar', length: 50, nullable: true })
  aevNominal: string | null;

  @Column({ name: 'ground_area', type: 'varchar', length: 50, nullable: true })
  groundArea: string | null;

  @Column({ name: 'structure_height', type: 'varchar', length: 50, nullable: true })
  structureHeight: string | null;

  @Column({ name: 'station_id', type: 'varchar', length: 100, nullable: true })
  stationId: string | null;

  @Column({ name: 'complex_order', type: 'varchar', length: 100, nullable: true })
  complexOrder: string | null;

  @Column({ name: 'thq_observation', type: 'text', nullable: true })
  thqObservation: string | null;

  @Column({ name: 'situation', type: 'text', nullable: true })
  situation: string | null;

  @Column({ name: 'ots', type: 'varchar', length: 10, nullable: true })
  ots: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
