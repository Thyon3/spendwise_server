import { Module } from '@nestjs/common';
import { ReportsController } from '../controllers/reports.controller';
import { GetSpendingSummaryUseCase, GetSpendingTrendsUseCase } from '../../../../application/use-cases/reports/reporting.use-case';
import { IReportingRepository } from '../../../../domain/repositories/reporting.repository.interface';
import { PrismaReportingRepository } from '../../persistence/prisma/prisma-reporting.repository';

@Module({
    controllers: [ReportsController],
    providers: [
        GetSpendingSummaryUseCase,
        GetSpendingTrendsUseCase,
        {
            provide: IReportingRepository,
            useClass: PrismaReportingRepository,
        },
    ],
    exports: [IReportingRepository],
})
export class ReportsModule { }
