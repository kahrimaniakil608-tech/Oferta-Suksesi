import { RequestThrottlerGuard } from './common/request-throttler.guard';
import { MaintenanceGuard } from './common/maintenance.guard';
import { WorkflowsModule } from './workflows/workflows.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ListingsModule } from './listings/listings.module';
import { CategoriesModule } from './categories/categories.module';
import { CitiesModule } from './cities/cities.module';
import { AdminModule } from './admin/admin.module';
import { PagesModule } from './pages/pages.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { AdsModule } from './ads/ads.module';
import { BlogModule } from './blog/blog.module';
import { SearchModule } from './search/search.module';
import { ReportsModule } from './reports/reports.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 1 minute window
      limit: 60,    // 60 requests per minute globally
    }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    ListingsModule,
    CategoriesModule,
    CitiesModule,
    AdminModule,
    PagesModule,
    UsersModule,
    CompaniesModule,
    AdsModule,
    BlogModule,
    SearchModule,
    ReportsModule,
    CleanupModule,
    WorkflowsModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: MaintenanceGuard },
    { provide: APP_GUARD, useClass: RequestThrottlerGuard },
  ],
})
export class AppModule {}
