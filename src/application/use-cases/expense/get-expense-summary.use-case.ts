import { Injectable } from '@nestjs/common';
import { IExpenseRepository, ExpenseSummary } from '../../../domain/repositories/expense.repository.interface';

@Injectable()
export class GetExpenseSummaryUseCase {
    constructor(private readonly expenseRepository: IExpenseRepository) { }

    async execute(userId: string, from: string, to: string): Promise<ExpenseSummary> {
        return this.expenseRepository.getSummary(
            userId,
            new Date(from),
            new Date(to)
        );
    }
}
