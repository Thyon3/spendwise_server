import { Injectable } from '@nestjs/common';

@Injectable()
export class CurrencyConversionService {
  private exchangeRates: Map<string, number> = new Map();

  async getExchangeRate(from: string, to: string): Promise<number> {
    // Fetch from external API or cache
    return 1.0;
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    const rate = await this.getExchangeRate(from, to);
    return amount * rate;
  }

  async convertExpenses(expenses: any[], targetCurrency: string) {
    return Promise.all(
      expenses.map(async (expense) => ({
        ...expense,
        convertedAmount: await this.convert(expense.amount, expense.currency, targetCurrency),
        originalCurrency: expense.currency,
        targetCurrency
      }))
    );
  }

  async refreshRates() {
    // Fetch latest rates from API
    console.log('Refreshing exchange rates');
  }
}
