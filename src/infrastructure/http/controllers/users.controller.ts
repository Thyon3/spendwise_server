import { Controller, Get } from '@nestjs/common';
import { GetUsersUseCase } from '../../../application/use-cases/user/get-users.use-case';

@Controller('users')
export class UsersController {
    constructor(private readonly getUsersUseCase: GetUsersUseCase) { }

    @Get()
    async findAll() {
        const users = await this.getUsersUseCase.execute();
        return users.map(user => ({
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
        }));
    }
}
