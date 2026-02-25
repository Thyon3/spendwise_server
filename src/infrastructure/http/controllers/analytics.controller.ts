import { Controller, Get, Query, Request } from '@nestjs/common';

@Controller('analytics')
export class AnalyticsController {
  @Get('spending-trends')
  async getSpendingTrends(@Request() req, @Query('months') months?: string) {
    return {
      trends: [],
      averageMonthly: 0,
      totalSpent: 0
    };
  }

  @Get('category-insights')
  async getCategoryInsights(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return {
      topCategories: [],
      categoryPercentages: {}
    };
  }

  @Get('predictions')
  async getPredictions(@Request() req) {
    return {
      nextMonthPrediction: 0,
      savingsRecommendation: 0
    };
  }

  @Get('comparison')
  async getComparison(@Request() req, @Query() query: any) {
    return {
      period1Total: 0,
      period2Total: 0,
      percentageChange: 0
    };
  }
}
