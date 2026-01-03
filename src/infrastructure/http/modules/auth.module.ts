import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from '../controllers/auth.controller';
import { RegisterUserUseCase } from '../../../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../../application/use-cases/auth/login-user.use-case';
import { GetCurrentUserUseCase } from '../../../application/use-cases/auth/get-current-user.use-case';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IPasswordHasher } from '../../../domain/services/password-hasher.interface';
import { ITokenService } from '../../../domain/services/token-service.interface';
import { PrismaUserRepository } from '../../persistence/prisma/prisma-user.repository';
import { BcryptPasswordHasher } from '../../services/bcrypt-password-hasher.service';
import { JwtTokenService } from '../../services/jwt-token-service.service';
import { JwtStrategy } from '../guards/jwt.strategy';
import { PrismaService } from '../../persistence/prisma/prisma.service';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN') as any,
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [
        PrismaService,
        RegisterUserUseCase,
        LoginUserUseCase,
        GetCurrentUserUseCase,
        JwtStrategy,
        {
            provide: IUserRepository,
            useClass: PrismaUserRepository,
        },
        {
            provide: IPasswordHasher,
            useClass: BcryptPasswordHasher,
        },
        {
            provide: ITokenService,
            useClass: JwtTokenService,
        },
    ],
    exports: [ITokenService],
})
export class AuthModule { }
