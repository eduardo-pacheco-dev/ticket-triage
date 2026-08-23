import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueEntry } from './queue/queue-entry.entity';
import { RequestType } from './request-types/request-type.entity';
import { SlaConfig } from './sla/sla-config.entity';
import { User } from './auth/user.entity';
import { AuthModule } from './auth/auth.module';
import { RateLimitService } from './common/rate-limit.service';
import { QueueController } from './queue/queue.controller';
import { AdminController } from './queue/admin.controller';
import { QueueService } from './queue/queue.service';
import { QueueEventsService } from './queue/queue-events.service';
import { RequestTypesController } from './request-types/request-types.controller';
import { RequestTypesService } from './request-types/request-types.service';
import { SlaController } from './sla/sla.controller';
import { SlaService } from './sla/sla.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USER ?? 'app',
      password: process.env.DB_PASSWORD ?? 'appsecret',
      database: process.env.DB_NAME ?? 'ticket_triage',
      entities: [QueueEntry, RequestType, SlaConfig, User],
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNC === 'false' ? false : true,
      retryAttempts: 20,
      retryDelay: 3000,
    }),
    TypeOrmModule.forFeature([QueueEntry]),
    TypeOrmModule.forFeature([RequestType]),
    TypeOrmModule.forFeature([SlaConfig]),
    TypeOrmModule.forFeature([User]),
    AuthModule,
  ],
  controllers: [QueueController, AdminController, RequestTypesController, SlaController],
  providers: [QueueService, RequestTypesService, SlaService, RateLimitService, QueueEventsService],
})
export class AppModule {}
