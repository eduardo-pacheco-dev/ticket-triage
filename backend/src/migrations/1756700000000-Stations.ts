import { MigrationInterface, QueryRunner } from 'typeorm';

export class Stations1756700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = (await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stations'`,
    )) as { TABLE_NAME: string }[];

    if (exists.length === 0) {
      await queryRunner.query(`
        CREATE TABLE stations (
          id varchar(36) NOT NULL PRIMARY KEY,
          name varchar(200) NOT NULL,
          code varchar(100) NOT NULL UNIQUE,
          address varchar(300) NULL,
          city varchar(150) NULL,
          state varchar(2) NULL,
          phone varchar(30) NULL,
          email varchar(200) NULL,
          responsible varchar(200) NULL,
          notes text NULL,
          created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX stations_code_idx (code)
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS stations');
  }
}
