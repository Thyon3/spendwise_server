import { Controller, Get, Query, UseGuards, Request, Response } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { ExportExpensesToCsvUseCase } from '../../../../application/use-cases/exports/export-expenses.use-case';
import { ExpenseFiltersDto } from '../../../../application/dtos/expense/expense.dto';
import { ExpenseFilters } from '../../../../domain/repositories/expense.repository.interface';

@Controller('exports')
@UseGuards(JwtAuthGuard)
export class ExportsController {
    constructor(private readonly exportExpensesUseCase: ExportExpensesToCsvUseCase) { }

    @Get('expenses')
    async exportExpenses(
        @Request() req: any,
        @Query() filtersDto: ExpenseFiltersDto,
        @Response() res: ExpressResponse,
    ) {
        const filters: ExpenseFilters = {
            from: filtersDto.from ? new Date(filtersDto.from) : undefined,
            to: filtersDto.to ? new Date(filtersDto.to) : undefined,
            categoryId: filtersDto.categoryId,
            tagId: filtersDto.tagId,
            search: filtersDto.search,
        };

        const csv = await this.exportExpensesUseCase.execute(req.user.userId, filters);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
        res.send(csv);
    }
}
