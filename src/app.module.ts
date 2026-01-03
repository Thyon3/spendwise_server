import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './infrastructure/http/modules/users.module';
import { HealthModule } from './infrastructure/http/modules/health.module';
import { AuthModule } from './infrastructure/http/modules/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule { }
