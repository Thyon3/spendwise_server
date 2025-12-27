import { Module } from '@nestjs/common';
import { InvestmentController } from '../controllers/investment.controller';
import {
    CreateInvestmentUseCase,
    ListInvestmentsUseCase,
    GetInvestmentUseCase,
    UpdateInvestmentUseCase,
    DeleteInvestmentUseCase,
    GetPortfolioSummaryUseCase,
} from '../../../application/use-cases/investment/investment.use-case';
import { PrismaInvestmentRepository } from '../../persistence/prisma/prisma-investment.repository';

@Module({
    controllers: [InvestmentController],
    providers: [
        CreateInvestmentUseCase,
        ListInvestmentsUseCase,
        GetInvestmentUseCase,
        UpdateInvestmentUseCase,
        DeleteInvestmentUseCase,
        GetPortfolioSummaryUseCase,
        PrismaInvestmentRepository,
    ],
})
export class InvestmentModule { }
