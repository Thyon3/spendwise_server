import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CreateRecurringExpenseUseCase, ListRecurringExpensesUseCase, UpdateRecurringExpenseUseCase, DeleteRecurringExpenseUseCase } from '../../../../application/use-cases/expense/recurring-expense-ops.use-case';
import { CreateRecurringExpenseDto, UpdateRecurringExpenseDto } from '../../../../application/dtos/expense/recurring-expense.dto';

@Controller('recurring-expenses')
@UseGuards(JwtAuthGuard)
export class RecurringExpensesController {
    constructor(
        private readonly createUseCase: CreateRecurringExpenseUseCase,
        private readonly listUseCase: ListRecurringExpensesUseCase,
        private readonly updateUseCase: UpdateRecurringExpenseUseCase,
        private readonly deleteUseCase: DeleteRecurringExpenseUseCase,
    ) { }

    @Get()
    async findAll(@Request() req: any) {
        return this.listUseCase.execute(req.user.userId);
    }

    @Post()
    async create(@Request() req: any, @Body() dto: CreateRecurringExpenseDto) {
        return this.createUseCase.execute(req.user.userId, dto);
    }

    @Put(':id')
    async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateRecurringExpenseDto) {
        return this.updateUseCase.execute(req.user.userId, id, dto);
    }

    @Delete(':id')
    async remove(@Request() req: any, @Param('id') id: string) {
        return this.deleteUseCase.execute(req.user.userId, id);
    }
}
