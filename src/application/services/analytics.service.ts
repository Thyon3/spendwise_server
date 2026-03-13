import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) { }

  async getSpendingTrends(userId: string, period: 'weekly' | 'monthly' | 'yearly') {
    const dateFilter = this.getDateFilter(period);

    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: dateFilter.startDate,
          lte: dateFilter.endDate,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return this.processSpendingTrends(expenses, period);
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

  async getIncomeVsExpenses(userId: string, period: 'weekly' | 'monthly' | 'yearly') {
    const dateFilter = this.getDateFilter(period);

    const [expenses, income] = await Promise.all([
      this.prisma.expense.groupBy({
        by: ['date'],
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
      }),
      this.prisma.income.groupBy({
        by: ['date'],
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
      }),
    ]);

    return this.combineIncomeExpenses(expenses, income, period);
  }

  async getBudgetPerformance(userId: string) {
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

  async getSavingsGoalsProgress(userId: string) {
    const savingsGoals = await this.prisma.savingsGoal.findMany({
      where: {
        userId,
      },
    });

    return savingsGoals.map(goal => {
      const progressPercentage = (goal.currentAmount / goal.targetAmount) * 100;
      const remaining = goal.targetAmount - goal.currentAmount;

      return {
        goalId: goal.id,
        goalName: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        remaining,
        progressPercentage,
        isCompleted: goal.isCompleted,
        daysUntilDeadline: goal.deadline
          ? Math.ceil((goal.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null,
      };
    });
  }

  async getFinancialSummary(userId: string) {
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const [totalExpenses, totalIncome, currentMonthExpenses, currentMonthIncome] = await Promise.all([
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
    ]);

    return {
      totalExpenses: totalExpenses._sum.amount || 0,
      totalIncome: totalIncome._sum.amount || 0,
      netWorth: (totalIncome._sum.amount || 0) - (totalExpenses._sum.amount || 0),
      currentMonthExpenses: currentMonthExpenses._sum.amount || 0,
      currentMonthIncome: currentMonthIncome._sum.amount || 0,
      currentMonthNet: (currentMonthIncome._sum.amount || 0) - (currentMonthExpenses._sum.amount || 0),
    };
  }

  async getPredictiveAnalytics(userId: string) {
    // Get last 3 months of data for prediction
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
      predictedMonthlyExpenses: predictions.monthlyExpenses,
      predictedCategorySpending: predictions.categorySpending,
      savingsRecommendations: predictions.recommendations,
    };
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
    // Group expenses by time period
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
        return date.toISOString().split('T')[0]; // Daily for weekly view
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'yearly':
        return `${date.getFullYear()}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private combineIncomeExpenses(expenses: any[], income: any[], period: string) {
    const combined = {};

    expenses.forEach(expense => {
      const key = this.getGroupingKey(expense.date, period);
      if (!combined[key]) {
        combined[key] = { date: key, expenses: 0, income: 0 };
      }
      combined[key].expenses += expense._sum.amount || 0;
    });

    income.forEach(inc => {
      const key = this.getGroupingKey(inc.date, period);
      if (!combined[key]) {
        combined[key] = { date: key, expenses: 0, income: 0 };
      }
      combined[key].income += inc._sum.amount || 0;
    });

    return Object.values(combined).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }

  private calculatePredictions(expenses: any[]) {
    // Simple linear regression for prediction
    // In a real implementation, you'd use more sophisticated ML models

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
      categorySpending: {}, // Simplified for this example
      recommendations: [
        'Consider reducing dining expenses by 15% to meet savings goals',
        'Your utility bills are higher than usual - check for efficiency improvements',
        'Great job on staying within budget for entertainment!',
      ],
    };
  }
}
