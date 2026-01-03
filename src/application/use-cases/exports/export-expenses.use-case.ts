import { Injectable } from '@nestjs/common';
import { IExpenseRepository, ExpenseFilters } from '../../../domain/repositories/expense.repository.interface';

@Injectable()
export class ExportExpensesToCsvUseCase {
    constructor(private readonly expenseRepository: IExpenseRepository) { }

    async execute(userId: string, filters: ExpenseFilters): Promise<string> {
        const expenses = await this.expenseRepository.findByUser(userId, {
            ...filters,
            page: 1,
            limit: 10000, // Maximum for export
        });

        // CSV Header
        const headers = ['Date', 'Amount', 'Currency', 'Category', 'Tags', 'Description'];
        const rows = [headers.join(',')];

        // CSV Rows
        for (const expense of expenses) {
            const row = [
                expense.date.toISOString().split('T')[0],
                expense.amount.toString(),
                expense.currency,
                expense.category?.name || '',
                expense.tags?.map(t => t.name).join(';') || '',
                `"${(expense.description || '').replace(/"/g, '""')}"`, // Escape quotes
            ];
            rows.push(row.join(','));
        }

        return rows.join('\n');
    }
}
