import { Injectable } from '@nestjs/common';
import { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
import { CreateCategoryDto } from '../../dtos/category/category.dto';
import { Category } from '../../../domain/entities/category.entity';

@Injectable()
export class CreateCategoryUseCase {
    constructor(private readonly categoryRepository: ICategoryRepository) { }

    async execute(userId: string, dto: CreateCategoryDto): Promise<Category> {
        return this.categoryRepository.create({
            ...dto,
            userId,
        });
    }
}
