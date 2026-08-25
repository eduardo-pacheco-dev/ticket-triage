import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceOrders1756600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = (await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_orders'`,
    )) as { TABLE_NAME: string }[];

    if (exists.length === 0) {
      await queryRunner.query(`
        CREATE TABLE service_orders (
          id varchar(36) NOT NULL PRIMARY KEY,
          order_number int NOT NULL UNIQUE,
          client_name varchar(200) NOT NULL,
          client_contact varchar(200) NULL,
          site_id varchar(100) NULL,
          description text NOT NULL,
          status varchar(20) NOT NULL DEFAULT 'pending',
          priority varchar(20) NOT NULL DEFAULT 'medium',
          assigned_to varchar(200) NULL,
          scheduled_date datetime NULL,
          notes text NULL,
          created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          completed_at datetime NULL,
          INDEX service_orders_status_idx (status),
          INDEX service_orders_priority_idx (priority)
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS service_orders');
  }
}
