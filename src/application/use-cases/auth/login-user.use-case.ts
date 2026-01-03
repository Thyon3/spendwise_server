import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IPasswordHasher } from '../../../domain/services/password-hasher.interface';
import { ITokenService } from '../../../domain/services/token-service.interface';
import { LoginUserDto } from '../../dtos/auth/login-user.dto';
import { AuthResponseDto } from '../../dtos/auth/auth-response.dto';

@Injectable()
export class LoginUserUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly passwordHasher: IPasswordHasher,
        private readonly tokenService: ITokenService,
    ) { }

    async execute(dto: LoginUserDto): Promise<AuthResponseDto> {
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await this.passwordHasher.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const accessToken = await this.tokenService.generateToken({
            userId: user.id,
            email: user.email,
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.createdAt,
            },
            accessToken,
        };
    }
}
