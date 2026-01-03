import { Module } from '@nestjs/common';
import { BudgetsController } from '../controllers/budgets.controller';
import {
    CreateBudgetUseCase,
    ListBudgetsUseCase,
    UpdateBudgetUseCase,
    DeleteBudgetUseCase,
    GetBudgetStatusUseCase,
} from '../../../../application/use-cases/budgets/budget.use-case';
import { IBudgetRepository } from '../../../../domain/repositories/budget.repository.interface';
import { PrismaBudgetRepository } from '../../persistence/prisma/prisma-budget.repository';

@Module({
    controllers: [BudgetsController],
    providers: [
        CreateBudgetUseCase,
        ListBudgetsUseCase,
        UpdateBudgetUseCase,
        DeleteBudgetUseCase,
        GetBudgetStatusUseCase,
        {
            provide: IBudgetRepository,
            useClass: PrismaBudgetRepository,
        },
    ],
    exports: [IBudgetRepository],
})
export class BudgetsModule { }
