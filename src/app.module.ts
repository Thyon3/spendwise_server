import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './infrastructure/http/modules/users.module';
import { HealthModule } from './infrastructure/http/modules/health.module';
import { AuthModule } from './infrastructure/http/modules/auth.module';
import { CategoriesModule } from './infrastructure/http/modules/categories.module';
import { ExpensesModule } from './infrastructure/http/modules/expenses.module';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    ExpensesModule,
  ],
})
export class AppModule { }
