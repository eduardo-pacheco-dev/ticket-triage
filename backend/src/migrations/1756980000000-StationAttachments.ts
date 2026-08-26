import { MigrationInterface, QueryRunner } from 'typeorm';

export class StationAttachments1756980000000 implements MigrationInterface {
  name = 'StationAttachments1756980000000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS station_attachments (
        id         VARCHAR(36)  NOT NULL,
        station_id VARCHAR(36)  NOT NULL,
        filename   VARCHAR(255) NOT NULL,
        mime_type  VARCHAR(127) NOT NULL,
        size       INT UNSIGNED NOT NULL,
        storage_key VARCHAR(36) NOT NULL,
        created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY station_attachments_storage_key_idx (storage_key),
        KEY station_attachments_station_idx (station_id),
        CONSTRAINT station_attachments_station_fk
          FOREIGN KEY (station_id) REFERENCES stations (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS station_attachments');
  }
}
