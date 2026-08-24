import { CreateDateColumn, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('telegram_config')
export class TelegramConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  token: string | null;

  @Column({ name: 'chat_id', type: 'varchar', length: 64, nullable: true })
  chatId: string | null;

  @CreateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
