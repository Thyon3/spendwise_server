import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class GetUsersUseCase {
    constructor(private readonly userRepository: IUserRepository) { }

    async execute(): Promise<User[]> {
        return this.userRepository.findAll();
    }
}
