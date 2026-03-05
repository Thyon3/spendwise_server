import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';

@Injectable()
export class PredictionService {
  constructor(private prisma: PrismaService) {}

  async predictNextMonthSpending(userId: string): Promise<number> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        },
      },
      select: { amount: true, date: true },
    });

    if (expenses.length === 0) return 0;

    // Simple moving average
    const monthlyTotals = this.groupByMonth(expenses);
    const average = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length;

    return Math.round(average * 100) / 100;
  }

  async getSavingsRecommendation(userId: string): Promise<number> {
    const [totalIncome, totalExpenses] = await Promise.all([
      this.prisma.income.aggregate({
        where: {
          userId,
          date: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 3)),
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          userId,
          date: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 3)),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const avgMonthlyIncome = (totalIncome._sum.amount || 0) / 3;
    const avgMonthlyExpenses = (totalExpenses._sum.amount || 0) / 3;
    const surplus = avgMonthlyIncome - avgMonthlyExpenses;

    // Recommend saving 20% of surplus
    return Math.max(0, Math.round(surplus * 0.2 * 100) / 100);
  }

  private groupByMonth(expenses: Array<{ amount: number; date: Date }>): number[] {
    const monthlyMap = new Map<string, number>();

    expenses.forEach((expense) => {
      const monthKey = `${expense.date.getFullYear()}-${expense.date.getMonth()}`;
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + expense.amount);
    });

    return Array.from(monthlyMap.values());
  }
}
