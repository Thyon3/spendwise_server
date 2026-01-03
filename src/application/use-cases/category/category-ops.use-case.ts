import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
import { Category } from '../../../domain/entities/category.entity';

@Injectable()
export class ListCategoriesForUserUseCase {
    constructor(private readonly categoryRepository: ICategoryRepository) { }

    async execute(userId: string): Promise<Category[]> {
        return this.categoryRepository.findByUser(userId);
    }
}

@Injectable()
export class UpdateCategoryUseCase {
    constructor(private readonly categoryRepository: ICategoryRepository) { }

    async execute(userId: string, categoryId: string, data: any): Promise<Category> {
        const category = await this.categoryRepository.findById(categoryId);
        if (!category) throw new NotFoundException('Category not found');
        if (category.userId !== userId) throw new ForbiddenException('You do not own this category');

        return this.categoryRepository.update(categoryId, data);
    }
}

@Injectable()
export class DeleteCategoryUseCase {
    constructor(private readonly categoryRepository: ICategoryRepository) { }

    async execute(userId: string, categoryId: string): Promise<void> {
        const category = await this.categoryRepository.findById(categoryId);
        if (!category) throw new NotFoundException('Category not found');
        if (category.userId !== userId) throw new ForbiddenException('You do not own this category');

        return this.categoryRepository.delete(categoryId);
    }
}
