import { Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserResponseDto } from '../../dtos/auth/auth-response.dto';

@Injectable()
export class GetCurrentUserUseCase {
    constructor(private readonly userRepository: IUserRepository) { }

    async execute(userId: string): Promise<UserResponseDto> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
        };
    }
}
