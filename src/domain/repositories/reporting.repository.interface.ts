import { TimeRangeReport, TrendReport, FinancialSummary } from '../entities/report.entity';

export interface ReportFilters {
    from: Date;
    to: Date;
    categoryIds?: string[];
    tagIds?: string[];
}

export interface TrendFilters {
    from: Date;
    to: Date;
    granularity: 'day' | 'week' | 'month';
}

export abstract class IReportingRepository {
    abstract getSpendingSummaryForPeriod(userId: string, filters: ReportFilters): Promise<TimeRangeReport>;
    abstract getSpendingTrends(userId: string, filters: TrendFilters): Promise<TrendReport>;
    abstract getFinancialSummary(userId: string, from: Date, to: Date): Promise<FinancialSummary>;
}
