import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnalyticsChecklists1756800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = (await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'analytics_checklists'`,
    )) as { TABLE_NAME: string }[];

    if (exists.length === 0) {
      await queryRunner.query(`
        CREATE TABLE analytics_checklists (
          id varchar(36) NOT NULL PRIMARY KEY,
          project varchar(300) NOT NULL,
          regional varchar(200) NULL,
          estado varchar(2) NULL,
          site_id varchar(100) NULL,
          oc varchar(100) NULL,
          smp_name varchar(300) NULL,
          scope varchar(300) NULL,
          smp_id varchar(100) NULL,
          module varchar(200) NULL,
          module_id varchar(100) NULL,
          implementation_vendor varchar(200) NULL,
          module_start_date datetime(6) NULL,
          section varchar(200) NULL,
          checklist_item varchar(500) NULL,
          status varchar(20) NOT NULL DEFAULT 'Pendente',
          rejection_comment text NULL,
          rejection_date datetime(6) NULL,
          modified_by varchar(200) NULL,
          created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX analytics_checklists_status_idx (status),
          INDEX analytics_checklists_site_id_idx (site_id),
          INDEX analytics_checklists_project_idx (project)
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS analytics_checklists');
  }
}
