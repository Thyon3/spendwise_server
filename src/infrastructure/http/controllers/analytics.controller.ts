import { Controller, Get, Query, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AnalyticsService } from '../../../application/services/analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Get('spending-trends')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get spending trends analysis', description: 'Analyze spending patterns over time with trends and predictions' })
  @ApiResponse({ status: 200, description: 'Spending trends retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months to analyze (default: 6)' })
  async getSpendingTrends(@Request() req, @Query('months') months?: string) {
    const monthCount = months ? parseInt(months) : 6;
    return this.analyticsService.getSpendingTrends(req.user.userId, monthCount);
  }

  @Get('category-insights')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get category insights', description: 'Detailed breakdown of spending by categories' })
  @ApiResponse({ status: 200, description: 'Category insights retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  async getCategoryInsights(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.analyticsService.getCategoryInsights(req.user.userId, startDate, endDate);
  }

  @Get('predictions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI-powered predictions', description: 'Predict future spending and provide savings recommendations' })
  @ApiResponse({ status: 200, description: 'Predictions generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPredictions(@Request() req) {
    return this.analyticsService.getPredictions(req.user.userId);
  }

  @Get('comparison')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compare spending periods', description: 'Compare spending between different time periods' })
  @ApiResponse({ status: 200, description: 'Comparison completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'period1Start', required: true, type: String })
  @ApiQuery({ name: 'period1End', required: true, type: String })
  @ApiQuery({ name: 'period2Start', required: true, type: String })
  @ApiQuery({ name: 'period2End', required: true, type: String })
  async getComparison(@Request() req, @Query() query: any) {
    return this.analyticsService.comparePeriods(req.user.userId, {
      period1: { start: query.period1Start, end: query.period1End },
      period2: { start: query.period2Start, end: query.period2End }
    });
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get comprehensive dashboard data', description: 'Get all analytics data for the main dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboard(@Request() req) {
    return this.analyticsService.getDashboardData(req.user.userId);
  }

  @Get('budget-performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get budget performance analysis', description: 'Analyze budget adherence and performance' })
  @ApiResponse({ status: 200, description: 'Budget performance retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBudgetPerformance(@Request() req, @Query('period') period?: string) {
    return this.analyticsService.getBudgetPerformance(req.user.userId, period);
  }

  @Get('financial-health-score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get financial health score', description: 'Calculate and return financial health metrics' })
  @ApiResponse({ status: 200, description: 'Financial health score calculated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFinancialHealthScore(@Request() req) {
    return this.analyticsService.getFinancialHealthScore(req.user.userId);
  }
}
