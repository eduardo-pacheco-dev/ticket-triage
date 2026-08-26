import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandStations1756950000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = async (table: string, column: string) => {
      const rows = (await queryRunner.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column],
      )) as { COLUMN_NAME: string }[];
      return rows.length > 0;
    };

    const addCol = async (table: string, col: string, def: string) => {
      if (!(await hasColumn(table, col))) {
        await queryRunner.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
      }
    };

    const addIndex = async (table: string, idx: string, col: string) => {
      const rows = (await queryRunner.query(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
        [table, idx],
      )) as { INDEX_NAME: string }[];
      if (rows.length === 0) {
        await queryRunner.query(`CREATE INDEX \`${idx}\` ON \`${table}\` (\`${col}\`)`);
      }
    };

    await addCol('stations', 'site_id', 'varchar(100) NULL');
    await addCol('stations', 'element_type', 'varchar(100) NULL');
    await addCol('stations', 'technology', 'varchar(50) NULL');
    await addCol('stations', 'connection_type', 'varchar(100) NULL');
    await addCol('stations', 'address_id', 'varchar(100) NULL');
    await addCol('stations', 'classification', 'varchar(100) NULL');
    await addCol('stations', 'acquisition_date', 'datetime NULL');
    await addCol('stations', 'construction_date', 'datetime NULL');
    await addCol('stations', 'activation_date', 'datetime NULL');
    await addCol('stations', 'deactivation_date', 'datetime NULL');
    await addCol('stations', 'cancellation_date', 'datetime NULL');
    await addCol('stations', 'area_contract_type', 'varchar(100) NULL');
    await addCol('stations', 'area_holder', 'varchar(200) NULL');
    await addCol('stations', 'infra_contract_type', 'varchar(100) NULL');
    await addCol('stations', 'infra_holder', 'varchar(200) NULL');
    await addCol('stations', 'infra_type', 'varchar(100) NULL');
    await addCol('stations', 'ev_type', 'varchar(100) NULL');
    await addCol('stations', 'ev_provider', 'varchar(200) NULL');
    await addCol('stations', 'observation', 'text NULL');
    await addCol('stations', 'justification', 'text NULL');
    await addCol('stations', 'street_type', 'varchar(50) NULL');
    await addCol('stations', 'street', 'varchar(300) NULL');
    await addCol('stations', 'number', 'varchar(20) NULL');
    await addCol('stations', 'complement', 'varchar(200) NULL');
    await addCol('stations', 'neighborhood', 'varchar(200) NULL');
    await addCol('stations', 'zip_code', 'varchar(10) NULL');
    await addCol('stations', 'regional', 'varchar(50) NULL');
    await addCol('stations', 'latitude', 'varchar(30) NULL');
    await addCol('stations', 'longitude', 'varchar(30) NULL');
    await addCol('stations', 'status', 'varchar(50) NULL');
    await addCol('stations', 'tower_type', 'varchar(100) NULL');
    await addCol('stations', 'aev_nominal', 'varchar(50) NULL');
    await addCol('stations', 'ground_area', 'varchar(50) NULL');
    await addCol('stations', 'structure_height', 'varchar(50) NULL');
    await addCol('stations', 'station_id', 'varchar(100) NULL');
    await addCol('stations', 'complex_order', 'varchar(100) NULL');
    await addCol('stations', 'thq_observation', 'text NULL');
    await addCol('stations', 'situation', 'text NULL');
    await addCol('stations', 'ots', 'varchar(10) NULL');

    await addIndex('stations', 'stations_site_id_idx', 'site_id');
    await addIndex('stations', 'stations_status_idx', 'status');
    await addIndex('stations', 'stations_regional_idx', 'regional');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dropCol = async (table: string, col: string) => {
      await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${col}\``);
    };

    await dropCol('stations', 'ots');
    await dropCol('stations', 'situation');
    await dropCol('stations', 'thq_observation');
    await dropCol('stations', 'complex_order');
    await dropCol('stations', 'station_id');
    await dropCol('stations', 'structure_height');
    await dropCol('stations', 'ground_area');
    await dropCol('stations', 'aev_nominal');
    await dropCol('stations', 'tower_type');
    await dropCol('stations', 'status');
    await dropCol('stations', 'longitude');
    await dropCol('stations', 'latitude');
    await dropCol('stations', 'regional');
    await dropCol('stations', 'zip_code');
    await dropCol('stations', 'neighborhood');
    await dropCol('stations', 'complement');
    await dropCol('stations', 'number');
    await dropCol('stations', 'street');
    await dropCol('stations', 'street_type');
    await dropCol('stations', 'justification');
    await dropCol('stations', 'observation');
    await dropCol('stations', 'ev_provider');
    await dropCol('stations', 'ev_type');
    await dropCol('stations', 'infra_type');
    await dropCol('stations', 'infra_holder');
    await dropCol('stations', 'infra_contract_type');
    await dropCol('stations', 'area_holder');
    await dropCol('stations', 'area_contract_type');
    await dropCol('stations', 'cancellation_date');
    await dropCol('stations', 'deactivation_date');
    await dropCol('stations', 'activation_date');
    await dropCol('stations', 'construction_date');
    await dropCol('stations', 'acquisition_date');
    await dropCol('stations', 'classification');
    await dropCol('stations', 'address_id');
    await dropCol('stations', 'connection_type');
    await dropCol('stations', 'technology');
    await dropCol('stations', 'element_type');
    await dropCol('stations', 'site_id');

    await queryRunner.query('DROP INDEX stations_site_id_idx ON stations');
    await queryRunner.query('DROP INDEX stations_status_idx ON stations');
    await queryRunner.query('DROP INDEX stations_regional_idx ON stations');
  }
}
