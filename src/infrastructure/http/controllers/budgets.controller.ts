import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import {
    CreateBudgetUseCase,
    ListBudgetsUseCase,
    UpdateBudgetUseCase,
    DeleteBudgetUseCase,
    GetBudgetStatusUseCase,
} from '../../../../application/use-cases/budgets/budget.use-case';
import { CreateBudgetDto, UpdateBudgetDto } from '../../../../application/dtos/budgets/budget.dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
    constructor(
        private readonly createUseCase: CreateBudgetUseCase,
        private readonly listUseCase: ListBudgetsUseCase,
        private readonly updateUseCase: UpdateBudgetUseCase,
        private readonly deleteUseCase: DeleteBudgetUseCase,
        private readonly getStatusUseCase: GetBudgetStatusUseCase,
    ) { }

    @Get()
    async findAll(@Request() req: any) {
        return this.listUseCase.execute(req.user.userId);
    }

    @Post()
    async create(@Request() req: any, @Body() dto: CreateBudgetDto) {
        return this.createUseCase.execute(req.user.userId, dto);
    }

    @Put(':id')
    async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
        return this.updateUseCase.execute(req.user.userId, id, dto);
    }

    @Delete(':id')
    async remove(@Request() req: any, @Param('id') id: string) {
        return this.deleteUseCase.execute(req.user.userId, id);
    }

    @Get('status')
    async getAllStatuses(@Request() req: any) {
        return this.getStatusUseCase.execute(req.user.userId);
    }

    @Get(':id/status')
    async getStatus(@Request() req: any, @Param('id') id: string) {
        return this.getStatusUseCase.execute(req.user.userId, id);
    }
}
