import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './infrastructure/http/modules/users.module';
import { HealthModule } from './infrastructure/http/modules/health.module';
import { AuthModule } from './infrastructure/http/modules/auth.module';
import { CategoriesModule } from './infrastructure/http/modules/categories.module';
import { ExpensesModule } from './infrastructure/http/modules/expenses.module';
import { ReportsModule } from './infrastructure/http/modules/reports.module';
import { BudgetsModule } from './infrastructure/http/modules/budgets.module';
import { ExportsModule } from './infrastructure/http/modules/exports.module';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    ExpensesModule,
    ReportsModule,
    BudgetsModule,
    ExportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
