import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './infrastructure/http/modules/users.module';
import { HealthModule } from './infrastructure/http/modules/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    UsersModule,
  ],
})
export class AppModule { }
