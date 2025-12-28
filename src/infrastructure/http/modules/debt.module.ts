import { Module } from '@nestjs/common';
import { DebtController } from '../controllers/debt.controller';
import {
    CreateDebtUseCase,
    ListDebtsUseCase,
    GetDebtUseCase,
    UpdateDebtUseCase,
    DeleteDebtUseCase,
    AddDebtPaymentUseCase,
    GetDebtSummaryUseCase,
} from '../../../application/use-cases/debt/debt.use-case';
import { PrismaDebtRepository } from '../../persistence/prisma/prisma-debt.repository';

@Module({
    controllers: [DebtController],
    providers: [
        CreateDebtUseCase,
        ListDebtsUseCase,
        GetDebtUseCase,
        UpdateDebtUseCase,
        DeleteDebtUseCase,
        AddDebtPaymentUseCase,
        GetDebtSummaryUseCase,
        PrismaDebtRepository,
    ],
})
export class DebtModule { }
