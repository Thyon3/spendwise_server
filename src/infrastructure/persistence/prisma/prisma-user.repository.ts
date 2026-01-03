import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { User } from '../../../domain/entities/user.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({ where: { id } });
        return user ? new User(user) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        return user ? new User(user) : null;
    }

    async create(data: Partial<User>): Promise<User> {
        const user = await this.prisma.user.create({
            data: {
                email: data.email!,
                password: data.password!,
            },
        });
        return new User(user);
    }

    async findAll(): Promise<User[]> {
        const users = await this.prisma.user.findMany();
        return users.map((user) => new User(user));
    }
}
