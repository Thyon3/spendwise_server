import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RegisterUserUseCase } from '../../../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../../application/use-cases/auth/login-user.use-case';
import { GetCurrentUserUseCase } from '../../../application/use-cases/auth/get-current-user.use-case';
import { RegisterUserDto } from '../../../application/dtos/auth/register-user.dto';
import { LoginUserDto } from '../../../application/dtos/auth/login-user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly registerUserUseCase: RegisterUserUseCase,
        private readonly loginUserUseCase: LoginUserUseCase,
        private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    ) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user', description: 'Create a new user account with email and password' })
    @ApiResponse({ status: 201, description: 'User successfully registered' })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
    @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
    async register(@Body() dto: RegisterUserDto) {
        const user = await this.registerUserUseCase.execute(dto);
        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
        };
    }

    @Post('login')
    @ApiOperation({ summary: 'User login', description: 'Authenticate user and return JWT token' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials' })
    async login(@Body() dto: LoginUserDto) {
        return this.loginUserUseCase.execute(dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user', description: 'Retrieve current user profile information' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
    async getMe(@Request() req: any) {
        return this.getCurrentUserUseCase.execute(req.user.userId);
    }
}
