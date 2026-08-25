import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueEntry } from './queue/queue-entry.entity';
import { RequestType } from './request-types/request-type.entity';
import { SlaConfig } from './sla/sla-config.entity';
import { User } from './auth/user.entity';
import { Notification } from './notifications/notification.entity';
import { NotificationRead } from './notifications/notification-read.entity';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { appDataSourceOptions } from './data-source';
import { QueueController } from './queue/queue.controller';
import { AdminController } from './queue/admin.controller';
import { QueueService } from './queue/queue.service';
import { RequestTypesController } from './request-types/request-types.controller';
import { RequestTypesService } from './request-types/request-types.service';
import { ServiceOrder } from './service-orders/service-order.entity';
import { ServiceOrdersController } from './service-orders/service-orders.controller';
import { ServiceOrdersService } from './service-orders/service-orders.service';
import { Station } from './stations/station.entity';
import { StationsController } from './stations/stations.controller';
import { StationsService } from './stations/stations.service';
import { SlaController } from './sla/sla.controller';
import { SlaService } from './sla/sla.service';
import { HealthController } from './health/health.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(appDataSourceOptions),
    TypeOrmModule.forFeature([QueueEntry]),
    TypeOrmModule.forFeature([RequestType]),
    TypeOrmModule.forFeature([SlaConfig]),
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([Notification]),
    TypeOrmModule.forFeature([NotificationRead]),
    TypeOrmModule.forFeature([ServiceOrder]),
    TypeOrmModule.forFeature([Station]),
    CommonModule,
    AuthModule,
    UsersModule,
    TelegramModule,
  ],
  controllers: [
    QueueController,
    AdminController,
    RequestTypesController,
    SlaController,
    HealthController,
    NotificationsController,
    ServiceOrdersController,
    StationsController,
  ],
  providers: [
    QueueService,
    RequestTypesService,
    SlaService,
    NotificationsService,
    ServiceOrdersService,
    StationsService,
  ],
})
export class AppModule {}
