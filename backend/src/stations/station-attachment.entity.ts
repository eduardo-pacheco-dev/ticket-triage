import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Station } from './station.entity';

@Entity('station_attachments')
@Index('station_attachments_station_idx', ['stationId'])
export class StationAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'station_id', type: 'varchar', length: 36 })
  stationId: string;

  @ManyToOne(() => Station, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'station_id' })
  station: Station;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 127 })
  mimeType: string;

  @Column({ type: 'int', unsigned: true })
  size: number;

  @Column({ name: 'storage_key', type: 'varchar', length: 36, unique: true })
  storageKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
