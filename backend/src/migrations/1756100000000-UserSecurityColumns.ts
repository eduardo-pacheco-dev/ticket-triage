import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserSecurityColumns1756100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN token_version int NOT NULL DEFAULT 0,
        ADD COLUMN must_change_password boolean NOT NULL DEFAULT TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN token_version,
        DROP COLUMN must_change_password
    `);
  }
}
