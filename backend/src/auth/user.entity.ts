import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { UserRole, UserStatus } from '@ticket-triage/shared';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 100 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: UserRole;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: UserStatus;

  @Column({ name: 'token_version', type: 'int', default: 0 })
  tokenVersion: number;

  @Column({ name: 'must_change_password', type: 'boolean', default: true })
  mustChangePassword: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
