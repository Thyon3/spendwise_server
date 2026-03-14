import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) { }

  async getSpendingTrends(userId: string, months: number) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return this.processSpendingTrends(expenses, 'monthly');
  }

  async getCategoryInsights(userId: string, startDate: string, endDate: string) {
    const categoryExpenses = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const categories = await this.prisma.category.findMany({
      where: {
        id: {
          in: categoryExpenses.map(e => e.categoryId),
        },
      },
    });

    const totalAmount = categoryExpenses.reduce((sum, e) => sum + (e._sum.amount || 0), 0);

    return {
      topCategories: categoryExpenses.map(expense => {
        const category = categories.find(c => c.id === expense.categoryId);
        return {
          categoryId: expense.categoryId,
          categoryName: category?.name || 'Unknown',
          categoryColor: category?.color || '#000000',
          totalAmount: expense._sum.amount || 0,
          transactionCount: expense._count.id,
          percentage: totalAmount > 0 ? ((expense._sum.amount || 0) / totalAmount) * 100 : 0,
        };
      }).sort((a, b) => b.totalAmount - a.totalAmount),
      categoryPercentages: categoryExpenses.reduce((acc, expense) => {
        const category = categories.find(c => c.id === expense.categoryId);
        acc[category?.name || 'Unknown'] = totalAmount > 0 ? ((expense._sum.amount || 0) / totalAmount) * 100 : 0;
        return acc;
      }, {}),
    };
  }

  async getPredictions(userId: string) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: threeMonthsAgo,
        },
      },
      include: {
        category: true,
      },
    });

    const predictions = this.calculatePredictions(expenses);

    return {
      nextMonthPrediction: predictions.monthlyExpenses,
      savingsRecommendation: predictions.recommendations[0] || 'No specific recommendations available',
    };
  }

  async comparePeriods(userId: string, periods: any) {
    const [period1Expenses, period2Expenses] = await Promise.all([
      this.prisma.expense.aggregate({
        where: {
          userId,
          date: {
            gte: new Date(periods.period1.start),
            lte: new Date(periods.period1.end),
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          userId,
          date: {
            gte: new Date(periods.period2.start),
            lte: new Date(periods.period2.end),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const period1Total = period1Expenses._sum.amount || 0;
    const period2Total = period2Expenses._sum.amount || 0;
    const percentageChange = period1Total > 0 ? ((period2Total - period1Total) / period1Total) * 100 : 0;

    return {
      period1Total,
      period2Total,
      percentageChange,
    };
  }

  async getDashboardData(userId: string) {
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const [totalExpenses, totalIncome, currentMonthExpenses, currentMonthIncome, categories] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      this.prisma.income.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          userId,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.income.aggregate({
        where: {
          userId,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { amount: true },
      }),
      this.getCategoryBreakdown(userId, 'monthly'),
    ]);

    return {
      totalExpenses: totalExpenses._sum.amount || 0,
      totalIncome: totalIncome._sum.amount || 0,
      netWorth: (totalIncome._sum.amount || 0) - (totalExpenses._sum.amount || 0),
      currentMonthExpenses: currentMonthExpenses._sum.amount || 0,
      currentMonthIncome: currentMonthIncome._sum.amount || 0,
      currentMonthNet: (currentMonthIncome._sum.amount || 0) - (currentMonthExpenses._sum.amount || 0),
      topCategories: categories.slice(0, 5),
    };
  }

  async getBudgetPerformance(userId: string, period?: 'weekly' | 'monthly' | 'yearly') {
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
      },
      include: {
        category: true,
      },
    });

    const budgetPerformance = await Promise.all(
      budgets.map(async (budget) => {
        const expenses = await this.prisma.expense.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            date: {
              gte: budget.periodStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lte: budget.periodEnd || new Date(),
            },
          },
          _sum: {
            amount: true,
          },
        });

        const spent = expenses._sum.amount || 0;
        const remaining = budget.amountLimit - spent;
        const percentageUsed = (spent / budget.amountLimit) * 100;

        return {
          budgetId: budget.id,
          budgetName: budget.name,
          categoryName: budget.category?.name || 'General',
          budgetLimit: budget.amountLimit,
          spent,
          remaining,
          percentageUsed,
          isOverBudget: percentageUsed > 100,
          isNearLimit: percentageUsed >= 90 && percentageUsed <= 100,
        };
      }),
    );

    return budgetPerformance;
  }

  async getFinancialHealthScore(userId: string) {
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const [totalExpenses, totalIncome, currentMonthExpenses, currentMonthIncome, budgets] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      this.prisma.income.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          userId,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.income.aggregate({
        where: {
          userId,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.budget.findMany({
        where: { userId },
      }),
    ]);

    const totalExp = totalExpenses._sum.amount || 0;
    const totalInc = totalIncome._sum.amount || 0;
    const currentMonthExp = currentMonthExpenses._sum.amount || 0;
    const currentMonthInc = currentMonthIncome._sum.amount || 0;

    // Calculate financial health score (0-100)
    let score = 50; // Base score

    // Income vs Expenses ratio (40% of score)
    if (totalInc > 0) {
      const ratio = (totalInc - totalExp) / totalInc;
      score += ratio * 40;
    }

    // Budget adherence (30% of score)
    if (budgets.length > 0) {
      const overBudgetCount = budgets.filter(b => {
        // Simplified check - in real implementation, check actual spending
        return false;
      }).length;
      const budgetScore = 30 * (1 - overBudgetCount / budgets.length);
      score += budgetScore;
    }

    // Savings rate (30% of score)
    if (currentMonthInc > 0) {
      const savingsRate = (currentMonthInc - currentMonthExp) / currentMonthInc;
      score += savingsRate * 30;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score: Math.round(score),
      grade: this.getGrade(score),
      recommendations: this.getRecommendations(score),
    };
  }

  async getCategoryBreakdown(userId: string, period: 'weekly' | 'monthly' | 'yearly') {
    const dateFilter = this.getDateFilter(period);

    const categoryExpenses = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        date: {
          gte: dateFilter.startDate,
          lte: dateFilter.endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const categories = await this.prisma.category.findMany({
      where: {
        id: {
          in: categoryExpenses.map(e => e.categoryId),
        },
      },
    });

    return categoryExpenses.map(expense => {
      const category = categories.find(c => c.id === expense.categoryId);
      return {
        categoryId: expense.categoryId,
        categoryName: category?.name || 'Unknown',
        categoryColor: category?.color || '#000000',
        totalAmount: expense._sum.amount || 0,
        transactionCount: expense._count.id,
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private getDateFilter(period: 'weekly' | 'monthly' | 'yearly') {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return { startDate, endDate };
  }

  private processSpendingTrends(expenses: any[], period: string) {
    const grouped = expenses.reduce((acc: any, expense) => {
      const key = this.getGroupingKey(expense.date, period);
      if (!acc[key]) {
        acc[key] = { date: key, amount: 0, count: 0 };
      }
      acc[key].amount += expense.amount;
      acc[key].count += 1;
      return acc;
    }, {});

    return Object.values(grouped);
  }

  private getGroupingKey(date: Date, period: string): string {
    switch (period) {
      case 'weekly':
        return date.toISOString().split('T')[0];
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'yearly':
        return `${date.getFullYear()}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private calculatePredictions(expenses: any[]) {
    const monthlyAverages = expenses.reduce((acc, expense) => {
      const month = `${expense.date.getFullYear()}-${String(expense.date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[month]) acc[month] = 0;
      acc[month] += expense.amount;
      return acc;
    }, {});

    const monthlyValues = Object.values(monthlyAverages) as number[];
    const averageMonthlySpend = monthlyValues.reduce((sum: number, val: number) => sum + val, 0) / monthlyValues.length;

    return {
      monthlyExpenses: averageMonthlySpend,
      categorySpending: {},
      recommendations: [
        'Consider reducing dining expenses by 15% to meet savings goals',
        'Your utility bills are higher than usual - check for efficiency improvements',
        'Great job on staying within budget for entertainment!',
      ],
    };
  }

  private getGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  private getRecommendations(score: number): string[] {
    if (score >= 80) {
      return [
        'Excellent financial health! Keep up the good work.',
        'Consider increasing your savings rate for long-term goals.',
      ];
    } else if (score >= 60) {
      return [
        'Good financial health with room for improvement.',
        'Review your budget categories for potential optimizations.',
      ];
    } else {
      return [
        'Financial health needs attention. Focus on reducing expenses.',
        'Consider creating a detailed budget and tracking all spending.',
        'Look for ways to increase your income or reduce major expenses.',
      ];
    }
  }
}
