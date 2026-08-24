import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converte as datas gravadas pelo app (driver com timezone 'Z', ou seja, em
 * UTC) para o fuso local do servidor, alinhando-as às colunas preenchidas
 * pelos defaults CURRENT_TIMESTAMP do banco. Sem isso, durações que cruzam
 * colunas dos dois grupos aparecem deslocadas pelo offset do fuso (-03:00).
 *
 * Assumção: offset fixo de 3h (Brasília sem horário de verão desde 2019).
 */
export class FixMixedTimezoneDates1756300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE queue_entries SET started_at = DATE_SUB(started_at, INTERVAL 3 HOUR)
       WHERE started_at IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE queue_entries SET completed_at = DATE_SUB(completed_at, INTERVAL 3 HOUR)
       WHERE completed_at IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE queue_entries SET started_at = DATE_ADD(started_at, INTERVAL 3 HOUR)
       WHERE started_at IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE queue_entries SET completed_at = DATE_ADD(completed_at, INTERVAL 3 HOUR)
       WHERE completed_at IS NOT NULL`,
    );
  }
}
