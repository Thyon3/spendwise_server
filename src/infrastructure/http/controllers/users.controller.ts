import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetUsersUseCase } from '../../../application/use-cases/user/get-users.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private readonly getUsersUseCase: GetUsersUseCase) { }

    @UseGuards(JwtAuthGuard)
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
