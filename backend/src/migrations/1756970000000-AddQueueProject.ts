import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQueueProject1756970000000 implements MigrationInterface {
  name = 'AddQueueProject1756970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('queue_entries');
    if (!table) return;
    const column = table.findColumnByName('project');
    if (!column) {
      await queryRunner.query(`ALTER TABLE queue_entries ADD COLUMN project VARCHAR(200) NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('queue_entries');
    if (!table) return;
    const column = table.findColumnByName('project');
    if (column) {
      await queryRunner.query(`ALTER TABLE queue_entries DROP COLUMN project`);
    }
  }
}
