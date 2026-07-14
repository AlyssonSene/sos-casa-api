import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Config
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

// Infrastructure
import { DatabaseModule } from './database/database.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ServicesModule } from './modules/services/services.module';
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { ChatModule } from './modules/chat/chat.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // ── Config ─────────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: '.env',
    }),

    // ── Events ─────────────────────────────────────────────────────────────────
    EventEmitterModule.forRoot(),

    // ── Infrastructure ─────────────────────────────────────────────────────────
    DatabaseModule,

    // ── Features ───────────────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    ClientsModule,
    AddressesModule,
    ProfessionalsModule,
    CategoriesModule,
    ServicesModule,
    ServiceRequestsModule,
    ChatModule,
    PaymentsModule,
    ReviewsModule,
    AttachmentsModule,
    NotificationsModule,
    AdminModule,
  ],
})
export class AppModule {}
