import 'dotenv/config';
import { DataSource } from 'typeorm';
import type { LogLevel } from 'typeorm';
import { QueueEntry } from './queue/queue-entry.entity';
import { RequestType } from './request-types/request-type.entity';
import { ServiceOrder } from './service-orders/service-order.entity';
import { Station } from './stations/station.entity';
import { SlaConfig } from './sla/sla-config.entity';
import { User } from './auth/user.entity';
import { InitSchema1756000000000 } from './migrations/1756000000000-InitSchema';
import { UserSecurityColumns1756100000000 } from './migrations/1756100000000-UserSecurityColumns';
import { UserRoleAndStatus1756200000000 } from './migrations/1756200000000-UserRoleAndStatus';
import { FixMixedTimezoneDates1756300000000 } from './migrations/1756300000000-FixMixedTimezoneDates';
import { TelegramConfig1756400000000 } from './migrations/1756400000000-TelegramConfig';
import { Notifications1756500000000 } from './migrations/1756500000000-Notifications';
import { ServiceOrders1756600000000 } from './migrations/1756600000000-ServiceOrders';
import { Stations1756700000000 } from './migrations/1756700000000-Stations';
import { AnalyticsChecklist } from './analytics/analytics-checklist.entity';
import { AnalyticsChecklists1756800000000 } from './migrations/1756800000000-AnalyticsChecklists';
import { ExpandStations1756950000000 } from './migrations/1756950000000-ExpandStations';

if (process.env.NODE_ENV === 'production' && process.env.DB_SYNC !== 'false') {
  throw new Error(
    'DB_SYNC deve ser "false" em produção. Execute as migrations (npm run migration:run).',
  );
}

export const migrations = [
  InitSchema1756000000000,
  UserSecurityColumns1756100000000,
  UserRoleAndStatus1756200000000,
  FixMixedTimezoneDates1756300000000,
  TelegramConfig1756400000000,
  Notifications1756500000000,
  ServiceOrders1756600000000,
  Stations1756700000000,
  AnalyticsChecklists1756800000000,
  ExpandStations1756950000000,
];

const dbLogging: LogLevel[] = process.env.DB_SYNC === 'false' ? ['error'] : ['error', 'schema'];

export const appDataSourceOptions = {
  type: 'mysql' as const,
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'app',
  password: process.env.DB_PASSWORD ?? 'appsecret',
  database: process.env.DB_NAME ?? 'ticket_triage',
  // Sem opção "timezone", o driver grava/lê datas no fuso local do processo,
  // igual ao CURRENT_TIMESTAMP usado pelos defaults do banco. Isso mantém
  // todas as colunas datetime na mesma convenção (misturar UTC e local fazia
  // as durações aparecerem deslocadas pelo offset do fuso).
  entities: [QueueEntry, RequestType, SlaConfig, User, ServiceOrder, Station, AnalyticsChecklist],
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
