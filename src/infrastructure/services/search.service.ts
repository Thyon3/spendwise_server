import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface SearchOptions {
  query: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'category' | 'description';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchExpenses(userId: string, options: SearchOptions): Promise<SearchResult<any>> {
    const {
      query,
      category,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc',
    } = options;

    // Build where clause
    const where: any = {
      userId,
    };

    // Text search in description and merchant
    if (query) {
      where.OR = [
        { description: { contains: query, mode: 'insensitive' } },
        { merchant: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category) {
      where.category = {
        name: { contains: category, mode: 'insensitive' },
      };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo);
      }
    }

    // Amount range filter
    if (amountMin || amountMax) {
      where.amount = {};
      if (amountMin) {
        where.amount.gte = amountMin;
      }
      if (amountMax) {
        where.amount.lte = amountMax;
      }
    }

    // Tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            name: { in: tags },
          },
        },
      };
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Count total items
    const total = await this.prisma.expense.count({ where });

    // Get paginated results
    const skip = (page - 1) * limit;
    const items = await this.prisma.expense.findMany({
      where,
      include: [
        { category: true },
        { tags: { include: { tag: true } } },
        { paymentMethod: true },
      ],
      orderBy,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  async searchIncome(userId: string, options: SearchOptions): Promise<SearchResult<any>> {
    const {
      query,
      category,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc',
    } = options;

    const where: any = {
      userId,
    };

    // Text search
    if (query) {
      where.OR = [
        { description: { contains: query, mode: 'insensitive' } },
        { source: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category) {
      where.category = {
        name: { contains: category, mode: 'insensitive' },
      };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo);
      }
    }

    // Amount range filter
    if (amountMin || amountMax) {
      where.amount = {};
      if (amountMin) {
        where.amount.gte = amountMin;
      }
      if (amountMax) {
        where.amount.lte = amountMax;
      }
    }

    // Order by
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const total = await this.prisma.income.count({ where });
    const skip = (page - 1) * limit;
    const items = await this.prisma.income.findMany({
      where,
      include: [{ category: true }],
      orderBy,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  async searchCategories(userId: string, query: string): Promise<any[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        userId,
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  async searchTags(userId: string, query: string): Promise<any[]> {
    const tags = await this.prisma.tag.findMany({
      where: {
        userId,
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
    });

    return tags;
  }

  async getSearchSuggestions(userId: string, query: string, type: 'all' | 'expenses' | 'income' | 'categories' | 'tags'): Promise<{
  expenses: string[];
  income: string[];
  categories: string[];
  tags: string[];
}> {
    const suggestions = {
      expenses: [],
      income: [],
      categories: [],
      tags: [],
    };

    if (type === 'all' || type === 'expenses') {
      const expenses = await this.prisma.expense.findMany({
        where: { userId },
        select: ['description', 'merchant'],
        distinct: true,
        take: 10,
        orderBy: { date: 'desc' },
      });

      suggestions.expenses = [
        ...new Set(expenses.map(e => e.description).filter(Boolean)),
        ...new Set(expenses.map(e => e.merchant).filter(Boolean)),
      ];
    }

    if (type === 'all' || type === 'income') {
      const income = await this.prisma.income.findMany({
        where: { userId },
        select: ['description', 'source'],
        distinct: true,
        take: 10,
        orderBy: { date: 'desc' },
      });

      suggestions.income = [
        ...new Set(income.map(i => i.description).filter(Boolean)),
        ...new Set(income.map(i => i.source).filter(Boolean)),
      ];
    }

    if (type === 'all' || type === 'categories') {
      const categories = await this.prisma.category.findMany({
        where: { userId },
        select: ['name'],
        distinct: true,
        take: 10,
        orderBy: { name: 'asc' },
      });

      suggestions.categories = categories.map(c => c.name);
    }

    if (type === 'all' || type === 'tags') {
      const tags = await this.prisma.tag.findMany({
        where: { userId },
        select: ['name'],
        distinct: true,
        take: 10,
        orderBy: { name: 'asc' },
      });

      suggestions.tags = tags.map(t => t.name);
    }

    return suggestions;
  }

  async advancedSearch(userId: string, options: SearchOptions): Promise<{
    expenses: SearchResult<any>;
    income: SearchResult<any>;
    totalResults: number;
  }> {
    const [expenses, income] = await Promise.all([
      this.searchExpenses(userId, options),
      this.searchIncome(userId, options),
    ]);

    return {
      expenses,
      income,
      totalResults: expenses.total + income.total,
    };
  }

  async getPopularSearchTerms(userId: string): Promise<Array<{
    term: string;
    count: number;
    type: 'expense' | 'income' | 'category' | 'tag';
  }>> {
    // This would typically be stored in a separate search analytics table
    // For now, we'll return mock data
    return [
      { term: 'grocery', count: 45, type: 'expense' },
      { term: 'restaurant', count: 32, type: 'expense' },
      { term: 'salary', count: 12, type: 'income' },
      { term: 'Food & Dining', count: 28, type: 'category' },
      { term: 'Transportation', count: 19, type: 'category' },
      { term: 'urgent', count: 8, type: 'tag' },
    ];
  }
}
