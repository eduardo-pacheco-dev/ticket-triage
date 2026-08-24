import { MigrationInterface, QueryRunner } from 'typeorm';

interface TableRow {
  TABLE_NAME: string;
}

export class Notifications1756500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = (await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('notifications', 'notification_reads')`,
    )) as TableRow[];
    const present = new Set(existing.map((t) => t.TABLE_NAME));

    if (!present.has('notifications')) {
      await queryRunner.query(`
        CREATE TABLE notifications (
          id varchar(36) NOT NULL PRIMARY KEY,
          title varchar(150) NOT NULL,
          body varchar(400) NOT NULL,
          protocol varchar(20) NULL,
          site_id varchar(100) NULL,
          status varchar(20) NULL,
          created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          INDEX notifications_created_at_idx (created_at)
        ) ENGINE=InnoDB
      `);
    }

    if (!present.has('notification_reads')) {
      await queryRunner.query(`
        CREATE TABLE notification_reads (
          notification_id varchar(36) NOT NULL,
          user_id varchar(36) NOT NULL,
          read_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          PRIMARY KEY (notification_id, user_id)
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS notification_reads');
    await queryRunner.query('DROP TABLE IF EXISTS notifications');
  }
}
