import { Injectable, ConflictException } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IPasswordHasher } from '../../../domain/services/password-hasher.interface';
import { RegisterUserDto } from '../../dtos/auth/register-user.dto';
import { User } from '../../../domain/entities/user.entity';

@Injectable()
export class RegisterUserUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly passwordHasher: IPasswordHasher,
    ) { }

    async execute(dto: RegisterUserDto): Promise<User> {
        const existingUser = await this.userRepository.findByEmail(dto.email);
        if (existingUser) {
            throw new ConflictException('Email already in use');
        }

        const hashedPassword = await this.passwordHasher.hash(dto.password);

        return this.userRepository.create({
            email: dto.email,
            password: hashedPassword,
        });
    }
}
