import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CreateTagUseCase, ListTagsUseCase, DeleteTagUseCase } from '../../../../application/use-cases/expense/tag-ops.use-case';
import { CreateTagDto } from '../../../../application/dtos/expense/tag.dto';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
    constructor(
        private readonly createUseCase: CreateTagUseCase,
        private readonly listUseCase: ListTagsUseCase,
        private readonly deleteUseCase: DeleteTagUseCase,
    ) { }

    @Get()
    async findAll(@Request() req: any) {
        return this.listUseCase.execute(req.user.userId);
    }

    @Post()
    async create(@Request() req: any, @Body() dto: CreateTagDto) {
        return this.createUseCase.execute(req.user.userId, dto);
    }

    @Delete(':id')
    async remove(@Request() req: any, @Param('id') id: string) {
        return this.deleteUseCase.execute(req.user.userId, id);
    }
}
