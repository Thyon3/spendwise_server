import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';

@Injectable()
export class CurrencyService {
  constructor(private prisma: PrismaService) {}

  async getExchangeRate(baseCurrency: string, targetCurrency: string): Promise<number> {
    if (baseCurrency === targetCurrency) {
      return 1;
    }

    const rate = await this.prisma.currencyRate.findUnique({
      where: {
        baseCurrency_targetCurrency: {
          baseCurrency,
          targetCurrency,
        },
      },
    });

    if (rate) {
      return rate.rate;
    }

    // Fallback: fetch from external API (implement later)
    return 1;
  }

  async updateExchangeRates(): Promise<void> {
    console.log('Updating exchange rates from external API...');
    // TODO: Implement external API integration (e.g., exchangerate-api.com)
  }

  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }
}
