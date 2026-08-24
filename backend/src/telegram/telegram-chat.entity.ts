import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('telegram_chats')
@Index(['chatId'], { unique: true })
export class TelegramChat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chat_id', type: 'varchar', length: 64 })
  chatId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  title: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
