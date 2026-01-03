import { Injectable } from '@nestjs/common';
import { IReportingRepository, ReportFilters, TrendFilters } from '../../../../domain/repositories/reporting.repository.interface';
import { TimeRangeReport, TrendReport, TrendPoint, CategoryBreakdown, TagBreakdown } from '../../../../domain/entities/report.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaReportingRepository implements IReportingRepository {
    constructor(private readonly prisma: PrismaService) { }

    async getSpendingSummaryForPeriod(userId: string, filters: ReportFilters): Promise<TimeRangeReport> {
        const { from, to, categoryIds, tagIds } = filters;

        const where: any = {
            userId,
            date: { gte: from, lte: to },
        };

        if (categoryIds && categoryIds.length > 0) {
            where.categoryId = { in: categoryIds };
        }

        if (tagIds && tagIds.length > 0) {
            where.tags = { some: { id: { in: tagIds } } };
        }

        // Get total amount
        const totalResult = await this.prisma.expense.aggregate({
            where,
            _sum: { amount: true },
        });

        const totalAmount = totalResult._sum.amount || 0;

        // Get category breakdown
        const categoryAggregates = await this.prisma.expense.groupBy({
            by: ['categoryId'],
            where,
            _sum: { amount: true },
        });

        const categoryBreakdown: CategoryBreakdown[] = [];
        for (const agg of categoryAggregates) {
            const category = await this.prisma.category.findUnique({
                where: { id: agg.categoryId },
            });

            const catTotal = agg._sum.amount || 0;
            categoryBreakdown.push({
                categoryId: agg.categoryId,
                categoryName: category?.name || 'Unknown',
                totalAmount: catTotal,
                percentageOfTotal: totalAmount > 0 ? (catTotal / totalAmount) * 100 : 0,
            });
        }

        // Get tag breakdown
        const expensesWithTags = await this.prisma.expense.findMany({
            where,
            include: { tags: true },
        });

        const tagTotalsMap = new Map<string, { name: string; total: number }>();
        for (const expense of expensesWithTags) {
            for (const tag of expense.tags) {
                const existing = tagTotalsMap.get(tag.id) || { name: tag.name, total: 0 };
                existing.total += expense.amount;
                tagTotalsMap.set(tag.id, existing);
            }
        }

        const tagBreakdown: TagBreakdown[] = Array.from(tagTotalsMap.entries()).map(([tagId, data]) => ({
            tagId,
            tagName: data.name,
            totalAmount: data.total,
            percentageOfTotal: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
        }));

        return new TimeRangeReport({
            from,
            to,
            totalAmount,
            categoryBreakdown,
            tagBreakdown,
        });
    }

    async getSpendingTrends(userId: string, filters: TrendFilters): Promise<TrendReport> {
        const { from, to, granularity } = filters;

        // Use raw SQL for efficient time bucketing
        const dateFormat = this.getDateFormatForGranularity(granularity);

        const result = await this.prisma.$queryRawUnsafe<Array<{ period_start: Date; total: number }>>(
            `
      SELECT 
        DATE_TRUNC($1, date) as period_start,
        SUM(amount) as total
      FROM "Expense"
      WHERE "userId" = $2
        AND date >= $3
        AND date <= $4
      GROUP BY DATE_TRUNC($1, date)
      ORDER BY period_start ASC
      `,
            granularity,
            userId,
            from,
            to
        );

        const trends: TrendPoint[] = result.map((row) => {
            const periodStart = new Date(row.period_start);
            const periodEnd = this.getPeriodEnd(periodStart, granularity);
            return new TrendPoint({
                periodStart,
                periodEnd,
                totalAmount: Number(row.total),
            });
        });

        return new TrendReport({
            granularity,
            trends,
        });
    }

    private getDateFormatForGranularity(granularity: 'day' | 'week' | 'month'): string {
        switch (granularity) {
            case 'day': return '%Y-%m-%d';
            case 'week': return '%Y-%U';
            case 'month': return '%Y-%m';
        }
    }

    private getPeriodEnd(periodStart: Date, granularity: 'day' | 'week' | 'month'): Date {
        const end = new Date(periodStart);
        switch (granularity) {
            case 'day':
                end.setDate(end.getDate() + 1);
                break;
            case 'week':
                end.setDate(end.getDate() + 7);
                break;
            case 'month':
                end.setMonth(end.getMonth() + 1);
                break;
        }
        end.setSeconds(end.getSeconds() - 1);
        return end;
    }
}
