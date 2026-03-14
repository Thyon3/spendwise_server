import { Controller, Get, Post, Put, Query, Request, UseGuards, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrencyService } from '../../../application/services/currency.service';

@ApiTags('currency')
@Controller('currency')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) { }

  @Get('supported')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get supported currencies', description: 'Retrieve list of all supported currencies' })
  @ApiResponse({ status: 200, description: 'Supported currencies retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSupportedCurrencies() {
    return this.currencyService.getSupportedCurrencies();
  }

  @Get('exchange-rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get exchange rate', description: 'Get current exchange rate between two currencies' })
  @ApiResponse({ status: 200, description: 'Exchange rate retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid currency codes' })
  @ApiQuery({ name: 'from', required: true, type: String, description: 'Source currency code' })
  @ApiQuery({ name: 'to', required: true, type: String, description: 'Target currency code' })
  async getExchangeRate(@Query('from') from: string, @Query('to') to: string) {
    return this.currencyService.getExchangeRate(from, to);
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert amount', description: 'Convert amount from one currency to another' })
  @ApiResponse({ status: 200, description: 'Amount converted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async convertAmount(@Request() req, @Body() body: { amount: number; from: string; to: string }) {
    return this.currencyService.convertAmount(body.amount, body.from, body.to);
  }

  @Get('user-preferred')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user preferred currency', description: 'Get the user\'s preferred currency setting' })
  @ApiResponse({ status: 200, description: 'User preferred currency retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserPreferredCurrency(@Request() req) {
    return this.currencyService.getUserPreferredCurrency(req.user.userId);
  }

  @Put('user-preferred')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set user preferred currency', description: 'Update the user\'s preferred currency' })
  @ApiResponse({ status: 200, description: 'User preferred currency updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid currency code' })
  async setUserPreferredCurrency(@Request() req, @Body() body: { currencyCode: string }) {
    await this.currencyService.setUserPreferredCurrency(req.user.userId, body.currencyCode);
    return { message: 'Preferred currency updated successfully' };
  }

  @Get('all-rates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all exchange rates', description: 'Get all exchange rates for a base currency' })
  @ApiResponse({ status: 200, description: 'All exchange rates retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'base', required: false, type: String, description: 'Base currency (default: USD)' })
  async getAllExchangeRates(@Query('base') base?: string) {
    return this.currencyService.getAllExchangeRates(base || 'USD');
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get currency history', description: 'Get historical exchange rate data' })
  @ApiResponse({ status: 200, description: 'Currency history retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'from', required: true, type: String, description: 'Source currency code' })
  @ApiQuery({ name: 'to', required: true, type: String, description: 'Target currency code' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default: 30)' })
  async getCurrencyHistory(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days) : 30;
    return this.currencyService.getCurrencyHistory(from, to, daysNum);
  }
}
