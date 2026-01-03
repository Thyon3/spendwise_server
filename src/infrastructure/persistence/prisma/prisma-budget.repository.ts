import { Injectable } from '@nestjs/common';
import { IBudgetRepository } from '../../../../domain/repositories/budget.repository.interface';
import { Budget, BudgetStatus, PeriodType } from '../../../../domain/entities/budget.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaBudgetRepository implements IBudgetRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Budget>): Promise<Budget> {
        const created = await this.prisma.budget.create({
            data: {
                userId: data.userId!,
                name: data.name!,
                amountLimit: data.amountLimit!,
                currency: data.currency!,
                periodType: data.periodType!,
                periodStart: data.periodStart,
                periodEnd: data.periodEnd,
                categoryId: data.categoryId,
            },
        });
        return new Budget(created);
    }

    async update(id: string, data: Partial<Budget>): Promise<Budget> {
        const updated = await this.prisma.budget.update({
            where: { id },
            data: {
                name: data.name,
                amountLimit: data.amountLimit,
                currency: data.currency,
                periodType: data.periodType,
                periodStart: data.periodStart,
                periodEnd: data.periodEnd,
                categoryId: data.categoryId,
            },
        });
        return new Budget(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.budget.delete({ where: { id } });
    }

    async findById(id: string): Promise<Budget | null> {
        const found = await this.prisma.budget.findUnique({ where: { id } });
        return found ? new Budget(found) : null;
    }

    async findByUser(userId: string): Promise<Budget[]> {
        const items = await this.prisma.budget.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return items.map(i => new Budget(i));
    }

    async getBudgetStatus(budgetId: string, currentDate: Date): Promise<BudgetStatus> {
        const budget = await this.prisma.budget.findUnique({ where: { id: budgetId } });
        if (!budget) throw new Error('Budget not found');

        const { periodStart, periodEnd } = this._calculatePeriod(
            budget.periodType as PeriodType,
            currentDate,
            budget.periodStart,
            budget.periodEnd
        );

        const where: any = {
            userId: budget.userId,
            date: { gte: periodStart, lte: periodEnd },
        };

        if (budget.categoryId) {
            where.categoryId = budget.categoryId;
        }

        const result = await this.prisma.expense.aggregate({
            where,
            _sum: { amount: true },
        });

        const amountSpent = result._sum.amount || 0;
        const percentageUsed = budget.amountLimit > 0 ? (amountSpent / budget.amountLimit) * 100 : 0;

        return new BudgetStatus({
            budgetId: budget.id,
            budgetName: budget.name,
            periodStart,
            periodEnd,
            amountLimit: budget.amountLimit,
            amountSpent,
            percentageUsed,
            isOverLimit: amountSpent > budget.amountLimit,
            isNearLimit: percentageUsed >= 80 && percentageUsed < 100,
        });
    }

    async getAllBudgetStatuses(userId: string, currentDate: Date): Promise<BudgetStatus[]> {
        const budgets = await this.findByUser(userId);
        const statuses = await Promise.all(
            budgets.map(b => this.getBudgetStatus(b.id, currentDate))
        );
        return statuses;
    }

    private _calculatePeriod(
        periodType: PeriodType,
        currentDate: Date,
        customStart?: Date,
        customEnd?: Date
    ): { periodStart: Date; periodEnd: Date } {
        const now = new Date(currentDate);

        switch (periodType) {
            case PeriodType.WEEKLY:
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);
                return { periodStart: weekStart, periodEnd: weekEnd };

            case PeriodType.MONTHLY:
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                return { periodStart: monthStart, periodEnd: monthEnd };

            case PeriodType.CUSTOM_RANGE:
                if (!customStart || !customEnd) throw new Error('Custom range requires start and end dates');
                return { periodStart: customStart, periodEnd: customEnd };

            default:
                throw new Error('Invalid period type');
        }
    }
}
