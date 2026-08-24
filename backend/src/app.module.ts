import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueEntry } from './queue/queue-entry.entity';
import { RequestType } from './request-types/request-type.entity';
import { SlaConfig } from './sla/sla-config.entity';
import { User } from './auth/user.entity';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { appDataSourceOptions } from './data-source';
import { QueueController } from './queue/queue.controller';
import { AdminController } from './queue/admin.controller';
import { QueueService } from './queue/queue.service';
import { QueueEventsService } from './queue/queue-events.service';
import { RequestTypesController } from './request-types/request-types.controller';
import { RequestTypesService } from './request-types/request-types.service';
import { SlaController } from './sla/sla.controller';
import { SlaService } from './sla/sla.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot(appDataSourceOptions),
    TypeOrmModule.forFeature([QueueEntry]),
    TypeOrmModule.forFeature([RequestType]),
    TypeOrmModule.forFeature([SlaConfig]),
    TypeOrmModule.forFeature([User]),
    CommonModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [
    QueueController,
    AdminController,
    RequestTypesController,
    SlaController,
    HealthController,
  ],
  providers: [QueueService, RequestTypesService, SlaService, QueueEventsService],
})
export class AppModule {}
