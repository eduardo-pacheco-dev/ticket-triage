import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1756000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id varchar(36) NOT NULL PRIMARY KEY,
        username varchar(100) NOT NULL UNIQUE,
        password_hash varchar(100) NOT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE request_types (
        id varchar(36) NOT NULL PRIMARY KEY,
        name varchar(200) NOT NULL UNIQUE,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE queue_entries (
        id varchar(36) NOT NULL PRIMARY KEY,
        protocol varchar(20) NOT NULL UNIQUE,
        full_name varchar(200) NOT NULL,
        identifier varchar(200) NOT NULL,
        site_id varchar(100) NOT NULL,
        technician_name varchar(200) NOT NULL,
        request_type varchar(200) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'waiting',
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        started_at datetime(6) NULL,
        completed_at datetime(6) NULL,
        INDEX queue_entries_site_id_idx (site_id)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE sla_config (
        id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        expected_wait_min int NOT NULL DEFAULT 60,
        expected_service_min int NOT NULL DEFAULT 120,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS sla_config');
    await queryRunner.query('DROP TABLE IF EXISTS queue_entries');
    await queryRunner.query('DROP TABLE IF EXISTS request_types');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
