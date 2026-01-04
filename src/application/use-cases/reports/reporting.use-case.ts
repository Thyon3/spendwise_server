import { Injectable } from '@nestjs/common';
import { IReportingRepository, ReportFilters, TrendFilters } from '../../../domain/repositories/reporting.repository.interface';
import { TimeRangeReport, TrendReport, FinancialSummary } from '../../../domain/entities/report.entity';
import { GetSpendingSummaryDto, GetSpendingTrendsDto } from '../../dtos/reports/reports.dto';

@Injectable()
export class GetSpendingSummaryUseCase {
    constructor(private readonly reportingRepository: IReportingRepository) { }

    async execute(userId: string, dto: GetSpendingSummaryDto): Promise<TimeRangeReport> {
        const filters: ReportFilters = {
            from: new Date(dto.from),
            to: new Date(dto.to),
            categoryIds: dto.categoryIds,
            tagIds: dto.tagIds,
        };
        return this.reportingRepository.getSpendingSummaryForPeriod(userId, filters);
    }
}

@Injectable()
export class GetSpendingTrendsUseCase {
    constructor(private readonly reportingRepository: IReportingRepository) { }

    async execute(userId: string, dto: GetSpendingTrendsDto): Promise<TrendReport> {
        const filters: TrendFilters = {
            from: new Date(dto.from),
            to: new Date(dto.to),
            granularity: dto.granularity,
        };
        return this.reportingRepository.getSpendingTrends(userId, filters);
    }
}
@Injectable()
export class GetFinancialSummaryUseCase {
    constructor(private readonly reportingRepository: IReportingRepository) { }

    async execute(userId: string, dto: GetSpendingSummaryDto): Promise<FinancialSummary> {
        return this.reportingRepository.getFinancialSummary(
            userId,
            new Date(dto.from),
            new Date(dto.to),
        );
    }
}
