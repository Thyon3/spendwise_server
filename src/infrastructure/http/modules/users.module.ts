import { Module } from '@nestjs/common';
import { UsersController } from '../http/controllers/users.controller';
import { GetUsersUseCase } from '../../application/use-cases/user/get-users.use-case';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { PrismaUserRepository } from '../persistence/prisma/prisma-user.repository';
import { PrismaService } from '../persistence/prisma/prisma.service';

@Module({
    controllers: [UsersController],
    providers: [
        PrismaService,
        GetUsersUseCase,
        {
            provide: IUserRepository,
            useClass: PrismaUserRepository,
        },
    ],
    exports: [IUserRepository],
})
export class UsersModule { }
