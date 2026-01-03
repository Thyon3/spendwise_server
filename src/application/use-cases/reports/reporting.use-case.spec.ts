import { Test, TestingModule } from '@nestjs/testing';
import { GetSpendingSummaryUseCase, GetSpendingTrendsUseCase } from './reporting.use-case';
import { IReportingRepository } from '../../../domain/repositories/reporting.repository.interface';
import { TimeRangeReport, TrendReport } from '../../../domain/entities/report.entity';

describe('Reporting Use Cases', () => {
    let summaryUseCase: GetSpendingSummaryUseCase;
    let trendsUseCase: GetSpendingTrendsUseCase;
    let reportingRepository: jest.Mocked<IReportingRepository>;

    beforeEach(async () => {
        const mockReportingRepository = {
            getSpendingSummaryForPeriod: jest.fn(),
            getSpendingTrends: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetSpendingSummaryUseCase,
                GetSpendingTrendsUseCase,
                {
                    provide: IReportingRepository,
                    useValue: mockReportingRepository,
                },
            ],
        }).compile();

        summaryUseCase = module.get<GetSpendingSummaryUseCase>(GetSpendingSummaryUseCase);
        trendsUseCase = module.get<GetSpendingTrendsUseCase>(GetSpendingTrendsUseCase);
        reportingRepository = module.get(IReportingRepository);
    });

    describe('GetSpendingSummaryUseCase', () => {
        it('should call repository with correct filters', async () => {
            const userId = 'user-1';
            const dto = { from: '2023-01-01', to: '2023-01-31' };
            const expectedReport = new TimeRangeReport({ totalAmount: 100, categoryBreakdown: [], tagBreakdown: [] });

            reportingRepository.getSpendingSummaryForPeriod.mockResolvedValue(expectedReport);

            const result = await summaryUseCase.execute(userId, dto);

            expect(result).toBe(expectedReport);
            expect(reportingRepository.getSpendingSummaryForPeriod).toHaveBeenCalledWith(
                userId,
                expect.objectContaining({
                    from: new Date(dto.from),
                    to: new Date(dto.to),
                })
            );
        });
    });

    describe('GetSpendingTrendsUseCase', () => {
        it('should call repository with correct granularity', async () => {
            const userId = 'user-1';
            const dto: any = { from: '2023-01-01', to: '2023-01-31', granularity: 'week' };
            const expectedReport = new TrendReport({ granularity: 'week', trends: [] });

            reportingRepository.getSpendingTrends.mockResolvedValue(expectedReport);

            const result = await trendsUseCase.execute(userId, dto);

            expect(result).toBe(expectedReport);
            expect(reportingRepository.getSpendingTrends).toHaveBeenCalledWith(
                userId,
                expect.objectContaining({
                    granularity: 'week',
                })
            );
        });
    });
});
