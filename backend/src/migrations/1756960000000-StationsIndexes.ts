import { MigrationInterface, QueryRunner } from 'typeorm';

export class StationsIndexes1756960000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasIndex = async (table: string, idx: string) => {
      const rows = (await queryRunner.query(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
        [table, idx],
      )) as { INDEX_NAME: string }[];
      return rows.length > 0;
    };

    const addIdx = async (table: string, idx: string, col: string) => {
      if (!(await hasIndex(table, idx))) {
        await queryRunner.query(`CREATE INDEX \`${idx}\` ON \`${table}\` (\`${col}\`)`);
      }
    };

    await addIdx('stations', 'stations_name_idx', 'name');
    await addIdx('stations', 'stations_code_idx', 'code');
    await addIdx('stations', 'stations_city_idx', 'city');
    await addIdx('stations', 'stations_state_idx', 'state');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX stations_name_idx ON stations');
    await queryRunner.query('DROP INDEX stations_code_idx ON stations');
    await queryRunner.query('DROP INDEX stations_city_idx ON stations');
    await queryRunner.query('DROP INDEX stations_state_idx ON stations');
  }
}
