import { Injectable } from '@nestjs/common';
import { ICategoryRepository } from '../../../../domain/repositories/category.repository.interface';
import { Category } from '../../../../domain/entities/category.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Category>): Promise<Category> {
        const category = await this.prisma.category.create({
            data: {
                name: data.name!,
                color: data.color!,
                userId: data.userId!,
            },
        });
        return new Category(category);
    }

    async findByUser(userId: string): Promise<Category[]> {
        const categories = await this.prisma.category.findMany({
            where: { userId },
            orderBy: { name: 'asc' },
        });
        return categories.map((c) => new Category(c));
    }

    async findById(id: string): Promise<Category | null> {
        const category = await this.prisma.category.findUnique({ where: { id } });
        return category ? new Category(category) : null;
    }

    async update(id: string, data: Partial<Category>): Promise<Category> {
        const category = await this.prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                color: data.color,
            },
        });
        return new Category(category);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.category.delete({ where: { id } });
    }
}
