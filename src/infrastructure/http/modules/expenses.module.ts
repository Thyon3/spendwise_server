import { Module } from '@nestjs/common';
import { ExpensesController } from '../controllers/expenses.controller';
import { CreateExpenseUseCase, ListExpensesForUserUseCase, UpdateExpenseUseCase, DeleteExpenseUseCase } from '../../../../application/use-cases/expense/expense-ops.use-case';
import { GetExpenseSummaryUseCase } from '../../../../application/use-cases/expense/get-expense-summary.use-case';
import { IExpenseRepository } from '../../../../domain/repositories/expense.repository.interface';
import { PrismaExpenseRepository } from '../../persistence/prisma/prisma-expense.repository';
import { PrismaService } from '../../persistence/prisma/prisma.service';

@Module({
    controllers: [ExpensesController],
    providers: [
        PrismaService,
        CreateExpenseUseCase,
        ListExpensesForUserUseCase,
        UpdateExpenseUseCase,
        DeleteExpenseUseCase,
        GetExpenseSummaryUseCase,
        {
            provide: IExpenseRepository,
            useClass: PrismaExpenseRepository,
        },
    ],
    exports: [IExpenseRepository],
})
export class ExpensesModule { }
