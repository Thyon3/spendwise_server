import { Test, TestingModule } from '@nestjs/testing';
import {
    GetSpendingSummaryUseCase,
    GetSpendingTrendsUseCase,
    GetFinancialSummaryUseCase,
} from './reporting.use-case';
import { IReportingRepository } from '../../../domain/repositories/reporting.repository.interface';
import { TimeRangeReport, TrendReport, FinancialSummary } from '../../../domain/entities/report.entity';

const mockReportingRepository = {
    getSpendingSummaryForPeriod: jest.fn(),
    getSpendingTrends: jest.fn(),
    getFinancialSummary: jest.fn(),
};

describe('Reporting Use Cases', () => {
    let summaryUseCase: GetSpendingSummaryUseCase;
    let trendsUseCase: GetSpendingTrendsUseCase;
    let financialSummaryUseCase: GetFinancialSummaryUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetSpendingSummaryUseCase,
                GetSpendingTrendsUseCase,
                GetFinancialSummaryUseCase,
                { provide: IReportingRepository, useValue: mockReportingRepository },
            ],
        }).compile();

        summaryUseCase = module.get<GetSpendingSummaryUseCase>(GetSpendingSummaryUseCase);
        trendsUseCase = module.get<GetSpendingTrendsUseCase>(GetSpendingTrendsUseCase);
        financialSummaryUseCase = module.get<GetFinancialSummaryUseCase>(GetFinancialSummaryUseCase);

        jest.resetAllMocks();
    });

    describe('GetSpendingSummaryUseCase', () => {
        it('should return spending summary', async () => {
            const report = new TimeRangeReport({ totalAmount: 100, categoryBreakdown: [], tagBreakdown: [] });
            mockReportingRepository.getSpendingSummaryForPeriod.mockResolvedValue(report);

            const dto = { from: '2023-01-01', to: '2023-01-31' };
            const result = await summaryUseCase.execute('user-1', dto);

            expect(result).toEqual(report);
            expect(mockReportingRepository.getSpendingSummaryForPeriod).toHaveBeenCalledWith(
                'user-1',
                expect.objectContaining({
                    from: new Date(dto.from),
                    to: new Date(dto.to),
                }),
            );
        });
    });

    describe('GetSpendingTrendsUseCase', () => {
        it('should return spending trends', async () => {
            const report = new TrendReport({ granularity: 'month', trends: [] });
            mockReportingRepository.getSpendingTrends.mockResolvedValue(report);

            const dto = { from: '2023-01-01', to: '2023-12-31', granularity: 'month' as const };
            const result = await trendsUseCase.execute('user-1', dto);

            expect(result).toEqual(report);
            expect(mockReportingRepository.getSpendingTrends).toHaveBeenCalledWith(
                'user-1',
                expect.objectContaining({
                    from: new Date(dto.from),
                    to: new Date(dto.to),
                    granularity: 'month',
                }),
            );
        });
    });

    describe('GetFinancialSummaryUseCase', () => {
        it('should return financial summary', async () => {
            const summary = new FinancialSummary({ income: 500, expense: 200, balance: 300 });
            mockReportingRepository.getFinancialSummary.mockResolvedValue(summary);

            const dto = { from: '2023-01-01', to: '2023-01-31' };
            const result = await financialSummaryUseCase.execute('user-1', dto);

            expect(result).toEqual(summary);
            expect(mockReportingRepository.getFinancialSummary).toHaveBeenCalledWith(
                'user-1',
                new Date(dto.from),
                new Date(dto.to),
            );
        });
    });
});
