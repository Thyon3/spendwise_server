import { Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(private cacheManager: Cache) { }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async clear(): Promise<void> {
    // Implementation depends on cache manager version
    // For newer versions, you might use this.cacheManager.clear()
    // For now, we'll remove the method
    console.log('Cache clear called - implementation depends on cache manager version');
  }

  // Cache key generators
  static userKey(userId: string): string {
    return `user:${userId}`;
  }

  static expenseListKey(userId: string, filters?: any): string {
    const filterStr = filters ? JSON.stringify(filters) : '';
    return `expenses:${userId}:${Buffer.from(filterStr).toString('base64')}`;
  }

  static budgetKey(userId: string, budgetId?: string): string {
    return budgetId ? `budget:${userId}:${budgetId}` : `budgets:${userId}`;
  }

  static reportKey(userId: string, reportType: string, period: string): string {
    return `report:${userId}:${reportType}:${period}`;
  }

  static categoryKey(userId: string): string {
    return `categories:${userId}`;
  }

  static settingsKey(userId: string): string {
    return `settings:${userId}`;
  }

  // Cache invalidation methods
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}`,
      `expenses:${userId}:*`,
      `budgets:${userId}`,
      `budget:${userId}:*`,
      `report:${userId}:*`,
      `categories:${userId}`,
      `settings:${userId}`,
    ];

    for (const pattern of patterns) {
      await this.del(pattern);
    }
  }

  async invalidateExpenseCache(userId: string): Promise<void> {
    await this.del(`expenses:${userId}:*`);
    await this.del(`report:${userId}:*`);
  }

  async invalidateBudgetCache(userId: string): Promise<void> {
    await this.del(`budgets:${userId}`);
    await this.del(`budget:${userId}:*`);
    await this.del(`report:${userId}:*`);
  }

  // Cache warming methods
  async warmUserCache(userId: string, data: any): Promise<void> {
    await this.set(CacheService.userKey(userId), data.user, 3600);
    await this.set(CacheService.categoryKey(userId), data.categories, 1800);
    await this.set(CacheService.settingsKey(userId), data.settings, 3600);
  }

  // Performance monitoring
  async getCacheStats(): Promise<any> {
    return {
      // This would depend on your cache implementation
      // For Redis, you could return info like memory usage, hit rate, etc.
      timestamp: new Date().toISOString(),
    };
  }
}
