import { Module } from '@nestjs/common';
import { IncomeController } from '../controllers/income.controller';
import { CreateIncomeUseCase, ListIncomesForUserUseCase, UpdateIncomeUseCase, DeleteIncomeUseCase } from '../../../application/use-cases/income/income-ops.use-case';
import { IIncomeRepository } from '../../../domain/repositories/income.repository.interface';
import { PrismaIncomeRepository } from '../../persistence/prisma/prisma-income.repository';

@Module({
    controllers: [IncomeController],
    providers: [
        CreateIncomeUseCase,
        ListIncomesForUserUseCase,
        UpdateIncomeUseCase,
        DeleteIncomeUseCase,
        {
            provide: IIncomeRepository,
            useClass: PrismaIncomeRepository,
        },
    ],
    exports: [IIncomeRepository],
})
export class IncomeModule { }
