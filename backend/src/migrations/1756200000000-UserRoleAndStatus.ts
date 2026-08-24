import { MigrationInterface, QueryRunner } from 'typeorm';

interface ColumnRow {
  COLUMN_NAME: string;
}

export class UserRoleAndStatus1756200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotente: ambientes com synchronize=true podem já ter as colunas
    // criadas pela entity antes da migration rodar.
    const existing = (await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN ('role', 'status')`,
    )) as ColumnRow[];
    const present = new Set(existing.map((c) => c.COLUMN_NAME));

    const additions: string[] = [];
    if (!present.has('role')) {
      additions.push("ADD COLUMN role varchar(20) NOT NULL DEFAULT 'user'");
    }
    if (!present.has('status')) {
      additions.push("ADD COLUMN status varchar(20) NOT NULL DEFAULT 'active'");
    }
    if (additions.length > 0) {
      await queryRunner.query(`ALTER TABLE users ${additions.join(', ')}`);
    }

    // Bootstrap: o usuário "admin" semeado passa a ser administrador.
    await queryRunner.query(`UPDATE users SET role = 'admin' WHERE username = 'admin'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN role,
        DROP COLUMN status
    `);
  }
}
