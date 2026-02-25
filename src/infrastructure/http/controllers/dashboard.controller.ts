import { Controller, Get, Query, Request } from '@nestjs/common';

@Controller('dashboard')
export class DashboardController {
  @Get('summary')
  async getSummary(@Request() req, @Query('period') period?: string) {
    return {
      totalExpenses: 0,
      totalIncome: 0,
      netBalance: 0,
      monthlyAverage: 0,
      topCategories: [],
      recentTransactions: [],
      budgetStatus: [],
      savingsGoalProgress: []
    };
  }

  @Get('widgets')
  async getWidgets(@Request() req) {
    return {
      quickStats: {},
      charts: [],
      alerts: []
    };
  }
}
