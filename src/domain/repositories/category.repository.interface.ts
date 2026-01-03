import { Category } from '../entities/category.entity';

export abstract class ICategoryRepository {
    abstract create(category: Partial<Category>): Promise<Category>;
    abstract findByUser(userId: string): Promise<Category[]>;
    abstract findById(id: string): Promise<Category | null>;
    abstract update(id: string, category: Partial<Category>): Promise<Category>;
    abstract delete(id: string): Promise<void>;
}
