import { Module } from '@nestjs/common';
import { SavingsGoalController } from '../controllers/savings-goal.controller';
import {
    CreateSavingsGoalUseCase,
    ListSavingsGoalsUseCase,
    GetSavingsGoalUseCase,
    UpdateSavingsGoalUseCase,
    DeleteSavingsGoalUseCase,
    ContributeToSavingsGoalUseCase,
} from '../../../application/use-cases/savings-goal/savings-goal.use-case';
import { SavingsGoalRepository } from '../../../../domain/repositories/savings-goal.repository';
import { PrismaSavingsGoalRepository } from '../../persistence/prisma/prisma-savings-goal.repository';

@Module({
    controllers: [SavingsGoalController],
    providers: [
        CreateSavingsGoalUseCase,
        ListSavingsGoalsUseCase,
        GetSavingsGoalUseCase,
        UpdateSavingsGoalUseCase,
        DeleteSavingsGoalUseCase,
        ContributeToSavingsGoalUseCase,
        {
            provide: SavingsGoalRepository,
            useClass: PrismaSavingsGoalRepository,
        },
    ],
    exports: [SavingsGoalRepository],
})
export class SavingsGoalsModule { }
