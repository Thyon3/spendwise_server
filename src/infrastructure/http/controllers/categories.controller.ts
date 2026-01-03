import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CreateCategoryUseCase } from '../../../../application/use-cases/category/create-category.use-case';
import { ListCategoriesForUserUseCase, UpdateCategoryUseCase, DeleteCategoryUseCase } from '../../../../application/use-cases/category/category-ops.use-case';
import { CreateCategoryDto, UpdateCategoryDto } from '../../../../application/dtos/category/category.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
    constructor(
        private readonly createCategoryUseCase: CreateCategoryUseCase,
        private readonly listCategoriesUseCase: ListCategoriesForUserUseCase,
        private readonly updateCategoryUseCase: UpdateCategoryUseCase,
        private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    ) { }

    @Get()
    async findAll(@Request() req: any) {
        return this.listCategoriesUseCase.execute(req.user.userId);
    }

    @Post()
    async create(@Request() req: any, @Body() dto: CreateCategoryDto) {
        return this.createCategoryUseCase.execute(req.user.userId, dto);
    }

    @Put(':id')
    async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
        return this.updateCategoryUseCase.execute(req.user.userId, id, dto);
    }

    @Delete(':id')
    async remove(@Request() req: any, @Param('id') id: string) {
        return this.deleteCategoryUseCase.execute(req.user.userId, id);
    }
}
