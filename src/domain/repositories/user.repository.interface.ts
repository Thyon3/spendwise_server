import { User } from '../entities/user.entity';

export abstract class IUserRepository {
    abstract findById(id: string): Promise<User | null>;
    abstract findByEmail(email: string): Promise<User | null>;
    abstract create(user: Partial<User>): Promise<User>;
    abstract findAll(): Promise<User[]>;
}
