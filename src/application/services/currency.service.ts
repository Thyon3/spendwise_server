import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

@Injectable()
export class CurrencyService {
  private readonly supportedCurrencies: Currency[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', decimalPlaces: 2 },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2 },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimalPlaces: 2 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2 },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalPlaces: 2 },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getSupportedCurrencies(): Promise<Currency[]> {
    return this.supportedCurrencies;
  }

  async getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
    if (from === to) {
      return {
        from,
        to,
        rate: 1,
        timestamp: new Date(),
      };
    }

    // Check if we have a cached rate that's less than 1 hour old
    const cachedRate = await this.getCachedExchangeRate(from, to);
    if (cachedRate) {
      return cachedRate;
    }

    // Fetch fresh exchange rate
    const rate = await this.fetchExchangeRate(from, to);
    
    // Cache the rate
    await this.cacheExchangeRate(rate);

    return rate;
  }

  async convertAmount(amount: number, from: string, to: string): Promise<{
    originalAmount: number;
    convertedAmount: number;
    fromCurrency: string;
    toCurrency: string;
    exchangeRate: number;
  }> {
    const exchangeRate = await this.getExchangeRate(from, to);
    const convertedAmount = amount * exchangeRate.rate;

    return {
      originalAmount: amount,
      convertedAmount: this.roundCurrency(convertedAmount, to),
      fromCurrency: from,
      toCurrency: to,
      exchangeRate: exchangeRate.rate,
    };
  }

  async setUserPreferredCurrency(userId: string, currencyCode: string): Promise<void> {
    const currency = this.supportedCurrencies.find(c => c.code === currencyCode);
    if (!currency) {
      throw new HttpException('Unsupported currency', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredCurrency: currencyCode },
    });
  }

  async getUserPreferredCurrency(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredCurrency: true },
    });

    return user?.preferredCurrency || 'USD';
  }

  async getAllExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRate[]> {
    const rates: ExchangeRate[] = [];
    
    for (const currency of this.supportedCurrencies) {
      if (currency.code !== baseCurrency) {
        try {
          const rate = await this.getExchangeRate(baseCurrency, currency.code);
          rates.push(rate);
        } catch (error) {
          console.error(`Failed to fetch rate for ${baseCurrency} to ${currency.code}:`, error);
        }
      }
    }

    return rates;
  }

  private async getCachedExchangeRate(from: string, to: string): Promise<ExchangeRate | null> {
    const cached = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: from,
        toCurrency: to,
        updatedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      },
    });

    if (cached) {
      return {
        from: cached.fromCurrency,
        to: cached.toCurrency,
        rate: cached.rate,
        timestamp: cached.updatedAt,
      };
    }

    return null;
  }

  private async cacheExchangeRate(rate: ExchangeRate): Promise<void> {
    await this.prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: rate.from,
          toCurrency: rate.to,
        },
      },
      update: {
        rate: rate.rate,
        updatedAt: new Date(),
      },
      create: {
        fromCurrency: rate.from,
        toCurrency: rate.to,
        rate: rate.rate,
      },
    });
  }

  private async fetchExchangeRate(from: string, to: string): Promise<ExchangeRate> {
    try {
      // In a real implementation, you would use a real exchange rate API
      // For this example, we'll simulate with mock data
      const mockRates: Record<string, Record<string, number>> = {
        USD: {
          EUR: 0.85,
          GBP: 0.73,
          JPY: 110.0,
          AUD: 1.35,
          CAD: 1.25,
          CHF: 0.92,
          CNY: 6.45,
          INR: 74.5,
          MXN: 20.1,
          BRL: 5.2,
          ZAR: 15.8,
        },
        EUR: {
          USD: 1.18,
          GBP: 0.86,
          JPY: 129.5,
          AUD: 1.59,
          CAD: 1.47,
          CHF: 1.08,
          CNY: 7.59,
          INR: 87.6,
          MXN: 23.6,
          BRL: 6.1,
          ZAR: 18.6,
        },
      };

      // If we don't have a direct rate, try to get it via USD
      let rate = mockRates[from]?.[to];
      
      if (!rate && mockRates['USD']?.[to] && mockRates[from]?.['USD']) {
        // Convert via USD: from -> USD -> to
        const fromToUsd = mockRates[from]['USD'];
        const usdToTo = mockRates['USD'][to];
        rate = fromToUsd * usdToTo;
      }

      if (!rate) {
        throw new Error(`Exchange rate not available for ${from} to ${to}`);
      }

      return {
        from,
        to,
        rate,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch exchange rate: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private roundCurrency(amount: number, currencyCode: string): number {
    const currency = this.supportedCurrencies.find(c => c.code === currencyCode);
    const decimalPlaces = currency?.decimalPlaces || 2;
    
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(amount * factor) / factor;
  }

  async getCurrencyHistory(from: string, to: string, days: number = 30): Promise<{
    date: string;
    rate: number;
  }[]> {
    // In a real implementation, you would fetch historical data from an API
    // For this example, we'll generate mock historical data
    const history: { date: string; rate: number }[] = [];
    const currentRate = await this.getExchangeRate(from, to);
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate some variation around the current rate
      const variation = 0.95 + Math.random() * 0.1; // ±5% variation
      const rate = currentRate.rate * variation;
      
      history.push({
        date: date.toISOString().split('T')[0],
        rate: this.roundCurrency(rate, to),
      });
    }

    return history;
  }
}
