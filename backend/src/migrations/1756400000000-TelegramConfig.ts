import { MigrationInterface, QueryRunner } from 'typeorm';

interface TableRow {
  TABLE_NAME: string;
}

export class TelegramConfig1756400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = (await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'telegram_config'`,
    )) as TableRow[];
    if (existing.length > 0) return;

    await queryRunner.query(`
      CREATE TABLE telegram_config (
        id int AUTO_INCREMENT PRIMARY KEY,
        token varchar(255) NULL,
        chat_id varchar(64) NULL,
        updated_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS telegram_config');
  }
}
