import { Module } from '@nestjs/common';
import { UsersController } from '../controllers/users.controller';
import { GetUsersUseCase } from '../../../../application/use-cases/user/get-users.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { PrismaUserRepository } from '../../persistence/prisma/prisma-user.repository';

@Module({
    controllers: [UsersController],
    providers: [
        GetUsersUseCase,
        {
            provide: IUserRepository,
            useClass: PrismaUserRepository,
        },
    ],
    exports: [IUserRepository],
})
export class UsersModule { }
