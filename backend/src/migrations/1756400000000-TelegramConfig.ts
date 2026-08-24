import { MigrationInterface, QueryRunner } from 'typeorm';

interface TableRow {
  TABLE_NAME: string;
}

export class TelegramConfig1756400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = (await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('telegram_config', 'telegram_chats')`,
    )) as TableRow[];
    const present = new Set(existing.map((t) => t.TABLE_NAME));

    if (!present.has('telegram_config')) {
      await queryRunner.query(`
        CREATE TABLE telegram_config (
          id int AUTO_INCREMENT PRIMARY KEY,
          token varchar(255) NULL,
          chat_id varchar(64) NULL,
          polling_enabled tinyint(1) NOT NULL DEFAULT 1,
          updated_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        )
      `);
    }

    if (!present.has('telegram_chats')) {
      await queryRunner.query(`
        CREATE TABLE telegram_chats (
          id int AUTO_INCREMENT PRIMARY KEY,
          chat_id varchar(64) NOT NULL UNIQUE,
          title varchar(120) NULL,
          created_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS telegram_chats');
    await queryRunner.query('DROP TABLE IF EXISTS telegram_config');
  }
}
