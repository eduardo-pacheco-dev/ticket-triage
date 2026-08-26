import { MigrationInterface, QueryRunner } from 'typeorm';

export class BulkStations1756900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = (await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bulk_stations'`,
    )) as { TABLE_NAME: string }[];

    if (exists.length === 0) {
      await queryRunner.query(`
        CREATE TABLE bulk_stations (
          id varchar(36) NOT NULL PRIMARY KEY,
          site_id varchar(100) NOT NULL,
          element_type varchar(100) NULL,
          technology varchar(50) NULL,
          connection_type varchar(100) NULL,
          address_id varchar(100) NULL,
          classification varchar(100) NULL,
          acquisition_date datetime(6) NULL,
          construction_date datetime(6) NULL,
          activation_date datetime(6) NULL,
          deactivation_date datetime(6) NULL,
          cancellation_date datetime(6) NULL,
          area_contract_type varchar(100) NULL,
          area_holder varchar(200) NULL,
          infra_contract_type varchar(100) NULL,
          infra_holder varchar(200) NULL,
          infra_type varchar(100) NULL,
          ev_type varchar(100) NULL,
          ev_provider varchar(200) NULL,
          observation text NULL,
          justification text NULL,
          street_type varchar(50) NULL,
          street varchar(300) NULL,
          number varchar(20) NULL,
          complement varchar(200) NULL,
          neighborhood varchar(200) NULL,
          city varchar(200) NULL,
          state varchar(2) NULL,
          zip_code varchar(10) NULL,
          regional varchar(50) NULL,
          latitude varchar(30) NULL,
          longitude varchar(30) NULL,
          status varchar(50) NULL,
          tower_type varchar(100) NULL,
          aev_nominal varchar(50) NULL,
          ground_area varchar(50) NULL,
          structure_height varchar(50) NULL,
          station_id varchar(100) NULL,
          complex_order varchar(100) NULL,
          thq_observation text NULL,
          situation text NULL,
          ots varchar(10) NULL,
          created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX bulk_stations_site_id_idx (site_id),
          INDEX bulk_stations_status_idx (status),
          INDEX bulk_stations_regional_idx (regional)
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS bulk_stations');
  }
}
