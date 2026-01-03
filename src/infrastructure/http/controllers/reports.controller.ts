import { Controller, Get, Query, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetSpendingSummaryUseCase, GetSpendingTrendsUseCase } from '../../../application/use-cases/reports/reporting.use-case';
import { GetSpendingSummaryDto, GetSpendingTrendsDto } from '../../../application/dtos/reports/reports.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor)
export class ReportsController {
    constructor(
        private readonly getSpendingSummaryUseCase: GetSpendingSummaryUseCase,
        private readonly getSpendingTrendsUseCase: GetSpendingTrendsUseCase,
    ) { }

    @Get('summary')
    async getSpendingSummary(@Request() req: any, @Query() dto: GetSpendingSummaryDto) {
        return this.getSpendingSummaryUseCase.execute(req.user.userId, dto);
    }

    @Get('trends')
    async getSpendingTrends(@Request() req: any, @Query() dto: GetSpendingTrendsDto) {
        return this.getSpendingTrendsUseCase.execute(req.user.userId, dto);
    }
}
