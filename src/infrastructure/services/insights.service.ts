import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';

interface SpendingInsight {
  type: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ALERT';
  data?: any;
}

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  async generateInsights(userId: string): Promise<SpendingInsight[]> {
    const insights: SpendingInsight[] = [];

    // Check for unusual spending
    const unusualSpending = await this.detectUnusualSpending(userId);
    if (unusualSpending) {
      insights.push(unusualSpending);
    }

    // Check for budget overruns
    const budgetWarnings = await this.checkBudgetStatus(userId);
    insights.push(...budgetWarnings);

    // Suggest savings opportunities
    const savingsOpportunities = await this.findSavingsOpportunities(userId);
    insights.push(...savingsOpportunities);

    return insights;
  }

  private async detectUnusualSpending(userId: string): Promise<SpendingInsight | null> {
    // TODO: Implement anomaly detection
    const thisMonthTotal = 1500;
    const avgMonthlyTotal = 1200;

    if (thisMonthTotal > avgMonthlyTotal * 1.3) {
      return {
        type: 'UNUSUAL_SPENDING',
        message: `Your spending is 25% higher than usual this month`,
        severity: 'WARNING',
        data: { current: thisMonthTotal, average: avgMonthlyTotal },
      };
    }

    return null;
  }

  private async checkBudgetStatus(userId: string): Promise<SpendingInsight[]> {
    // TODO: Check all budgets and return warnings
    return [];
  }

  private async findSavingsOpportunities(userId: string): Promise<SpendingInsight[]> {
    const insights: SpendingInsight[] = [];

    // TODO: Analyze spending patterns and suggest savings
    insights.push({
      type: 'SAVINGS_OPPORTUNITY',
      message: 'You could save $50/month by reducing dining out expenses',
      severity: 'INFO',
    });

    return insights;
  }

  async getSpendingTrends(userId: string, months: number = 6): Promise<any> {
    // TODO: Calculate spending trends over time
    return {
      trend: 'INCREASING',
      percentageChange: 15,
      categories: [],
    };
  }
}
