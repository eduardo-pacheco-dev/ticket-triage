import 'dotenv/config';
import { DataSource } from 'typeorm';
import type { LogLevel } from 'typeorm';
import { QueueEntry } from './queue/queue-entry.entity';
import { RequestType } from './request-types/request-type.entity';
import { SlaConfig } from './sla/sla-config.entity';
import { User } from './auth/user.entity';
import { InitSchema1756000000000 } from './migrations/1756000000000-InitSchema';
import { UserSecurityColumns1756100000000 } from './migrations/1756100000000-UserSecurityColumns';

if (process.env.NODE_ENV === 'production' && process.env.DB_SYNC !== 'false') {
  throw new Error(
    'DB_SYNC deve ser "false" em produção. Execute as migrations (npm run migration:run).',
  );
}

export const migrations = [InitSchema1756000000000, UserSecurityColumns1756100000000];

const dbLogging: LogLevel[] = process.env.DB_SYNC === 'false' ? ['error'] : ['error', 'schema'];

export const appDataSourceOptions = {
  type: 'mysql' as const,
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'app',
  password: process.env.DB_PASSWORD ?? 'appsecret',
  database: process.env.DB_NAME ?? 'ticket_triage',
  // Datas são gravadas/lidas sempre em UTC, independente do TZ do host.
  timezone: 'Z',
  entities: [QueueEntry, RequestType, SlaConfig, User],
  autoLoadEntities: true,
  synchronize: process.env.DB_SYNC === 'false' ? false : true,
  logging: dbLogging,
  retryAttempts: 20,
  retryDelay: 3000,
};

export default new DataSource({
  ...appDataSourceOptions,
  synchronize: false,
  migrations,
});
