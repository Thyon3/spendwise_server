import { Module } from '@nestjs/common';
import { CategoriesController } from '../controllers/categories.controller';
import { CreateCategoryUseCase } from '../../../../application/use-cases/category/create-category.use-case';
import { ListCategoriesForUserUseCase, UpdateCategoryUseCase, DeleteCategoryUseCase } from '../../../../application/use-cases/category/category-ops.use-case';
import { ICategoryRepository } from '../../../../domain/repositories/category.repository.interface';
import { PrismaCategoryRepository } from '../../persistence/prisma/prisma-category.repository';

@Module({
    controllers: [CategoriesController],
    providers: [
        CreateCategoryUseCase,
        ListCategoriesForUserUseCase,
        UpdateCategoryUseCase,
        DeleteCategoryUseCase,
        {
            provide: ICategoryRepository,
            useClass: PrismaCategoryRepository,
        },
    ],
    exports: [ICategoryRepository],
})
export class CategoriesModule { }
