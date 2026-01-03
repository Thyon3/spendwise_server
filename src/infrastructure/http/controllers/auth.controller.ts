import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { RegisterUserUseCase } from '../../../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../../application/use-cases/auth/login-user.use-case';
import { GetCurrentUserUseCase } from '../../../application/use-cases/auth/get-current-user.use-case';
import { RegisterUserDto } from '../../../application/dtos/auth/register-user.dto';
import { LoginUserDto } from '../../../application/dtos/auth/login-user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly registerUserUseCase: RegisterUserUseCase,
        private readonly loginUserUseCase: LoginUserUseCase,
        private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    ) { }

    @Post('register')
    async register(@Body() dto: RegisterUserDto) {
        const user = await this.registerUserUseCase.execute(dto);
        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
        };
    }

    @Post('login')
    async login(@Body() dto: LoginUserDto) {
        return this.loginUserUseCase.execute(dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req: any) {
        return this.getCurrentUserUseCase.execute(req.user.userId);
    }
}
