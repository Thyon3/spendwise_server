import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CacheItem<T> {
  value: T;
  expiry: number;
  accessCount: number;
  size: number;
  tags?: string[];
}

export interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  topKeys: Array<{
    key: string;
    accessCount: number;
    size: number;
  }>;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
  enableStats: boolean;
  enableCompression: boolean;
  enableEncryption: boolean;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, CacheItem<any>>();
  private readonly stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    accesses: new Map<string, number>(),
  };

  private config: CacheConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      defaultTTL: configService.get<number>('CACHE_DEFAULT_TTL', 300),
      maxSize: configService.get<number>('CACHE_MAX_SIZE', 1000),
      cleanupInterval: configService.get<number>('CACHE_CLEANUP_INTERVAL', 60000),
      enableStats: configService.get<boolean>('CACHE_ENABLE_STATS', true),
      enableCompression: configService.get<boolean>('CACHE_ENABLE_COMPRESSION', false),
      enableEncryption: configService.get<boolean>('CACHE_ENABLE_ENCRYPTION', false),
    };

    // Start cleanup interval
    if (this.config.cleanupInterval > 0) {
      setInterval(() => {
        this.cleanupExpired();
      }, this.config.cleanupInterval);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    this.stats.hits++;
    this.stats.accesses.set(key, (this.stats.accesses.get(key) || 0) + 1);

    return item.value as T;
  }

  async set<T>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      tags?: string[];
      priority?: 'high' | 'normal' | 'low';
    },
  ): Promise<void> {
    const ttl = options?.ttl ?? this.config.defaultTTL;
    const expiry = Date.now() + ttl * 1000;
    const size = this.calculateSize(value);

    // Check if cache is full
    if (this.cache.size >= this.config.maxSize) {
      await this.evictLeastRecentlyUsed();
    }

    const cacheItem: CacheItem<T> = {
      value,
      expiry,
      accessCount: 0,
      size,
      tags: options?.tags,
    };

    this.cache.set(key, cacheItem);
  }

  async delete(key: string): Promise<void> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.evictions++;
    }
  }

  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.evictions += size;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.accesses.clear();
  }

  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: {
      ttl?: number;
      tags?: string[];
      priority?: 'high' | 'normal' | 'getOrSet';
    },
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      results.set(key, value);
    }

    return results;
  }

  async setMultiple<T>(
    items: Map<string, T>,
    options?: {
      ttl?: number;
      tags?: string[];
      priority?: 'high' | 'normal' | 'low';
    },
  ): Promise<void> {
    for (const [key, value] of items) {
      await this.set(key, value, options);
    }
  }

  async deleteMultiple(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.delete(key);
    }
  }

  async increment<T>(key: string, delta: number = 1): Promise<T | null> {
    const current = await this.get<T>(key);

    if (current === null) {
      return null;
    }

    const newValue = typeof current === 'number' ? current + delta : current;
    await this.set(key, newValue);
    return newValue;
  }

  async touch(key: string): Promise<void> {
    const item = this.cache.get(key);

    if (item) {
      const updatedItem: CacheItem<T> = {
        ...item,
        expiry: Date.now() + (item.expiry - Date.now()),
        accessCount: item.accessCount + 1,
      };
      this.cache.set(key, updatedItem);
    }
  }

  async extendTTL(key: string, additionalSeconds: number): Promise<void> {
    const item = this.cache.get(key);

    if (item) {
      const updatedItem: CacheItem<T> = {
        ...item,
        expiry: item.expiry + (additionalSeconds * 1000),
      };
      this.cache.set(key, updatedItem);
    }
  }

  async getTTL(key: string): Promise<number | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    const remaining = item.expiry - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : null;
  }

  async getKeysByTag(tag: string): Promise<string[]> {
    const keys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (item.tags?.includes(tag)) {
        keys.push(key);
      }
    }

    return keys;
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern);
    const keys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }

    return keys;
  }

  async cleanupExpired(): Promise<void> {
    const now = Date.now();
    let evictedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        evictedCount++;
      }
    }

    if (evictedCount > 0) {
      this.logger.log(`Cleaned up ${evictedCount} expired cache entries`);
    }
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    let oldestKey = '';
    let oldestTime = Date.now();
    let leastUsedKey = '';
    let leastUsedCount = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.accessCount < leastUsedCount) {
        leastUsedCount = item.accessCount;
        leastUsedKey = key;
      }

      if (item.accessCount === 0 && item.expiry < oldestTime) {
        oldestTime = item.expiry;
        oldestKey = key;
      }
    }

    // If no items with zero access, use the oldest item
    const keyToEvict = leastUsedKey || oldestKey;
    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
    }
  }

  private calculateSize(value: any): number {
    try {
      // Rough size estimation
      if (value === null || value === undefined) {
        return 0;
      }

      if (typeof value === 'string') {
        return value.length * 2; // UTF-16
      }

      if (typeof value === 'number') {
        return 8; // 64-bit number
      }

      if (typeof value === 'boolean') {
        return 4;
      }

      if (typeof value === 'object') {
        return JSON.stringify(value).length * 2;
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0;

    // Get top keys by access count
    const topKeys = Array.from(this.stats.accesses.entries())
      .map(([key, count]) => ({ key, accessCount: count, size: 0 }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      totalItems: this.cache.size,
      totalSize: Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0),
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      evictionCount: this.stats.evictions,
      topKeys,
    };
  }

  async getCacheInfo(): Promise<{
    key: string;
    value: any;
    expiry: number;
    accessCount: number;
    size: number;
    tags: string[];
  }[]> {
    const info = [];

    for (const [key, item] of this.cache.entries()) {
      info.push({
        key,
        value: item.value,
        expiry: item.expiry,
        accessCount: updateCount,
        size: item.size,
        tags: item.tags || [],
      });
    }

    return info;
  }

  async warmCache<T>(
    keyPrefix: string,
    factory: (key: string) => Promise<T>,
    count: number,
    options?: {
      ttl?: number;
      tags?: string[];
    },
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      const key = `${keyPrefix}:${i}`;
      promises.push(
        this.getOrSet(key, () => factory(key), options)
      );
    }

    await Promise.all(promises);
  }

  async invalidateByTag(tag: string): Promise<void> {
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (item.tags?.includes(tag)) {
        keysToDelete.push(key);
      }
    }

    await this.deleteMultiple(keysToDelete);
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    const keysToDelete = await this.getKeysByPattern(pattern);
    await this.deleteMultiple(keysToDelete);
  }

  async getMemoryUsage(): Promise<{
    totalItems: number;
    totalSize: number;
    averageItemSize: number;
    oldestExpiry: Date | null;
    newestExpiry: Date | null;
  }> {
    if (this.cache.size === 0) {
      return {
        totalItems: 0,
        totalSize: 0,
        averageItemSize: 0,
        oldestExpiry: null,
        newestExpiry: null,
      };
    }

    const items = Array.from(this.cache.values());
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const averageItemSize = totalSize / items.length;

    const expiries = items.map(item => item.expiry);
    const oldestExpiry = new Date(Math.min(...expiries));
    const newestExpiry = new Date(Math.max(...expiries));

    return {
      totalItems: this.cache.size,
      totalSize,
      averageItemSize: Math.round(averageItemSize),
      oldestExpiry,
      newestExpiry,
    };
  }

  // TTL-based operations
  async setWithTTL<T>(
    key: string,
    value: T,
    ttl: number,
    options?: {
      tags?: string[];
    },
  ): Promise<void> {
    await this.set(key, value, { ttl, ...options });
  }

  async setWithExpiry<T>(
    key: string,
    value: T,
    expiryDate: Date,
    options?: {
      tags?: string[];
    },
  ): Promise<void> {
    const ttl = Math.floor((expiryDate.getTime() - Date.now()) / 1000);
    await this.set(key, value, { ttl, ...options });
  }

  // Bulk operations
  async bulkSet<T>(
    items: Array<{ key: string; value: T; options?: { ttl?: number; tags?: string[] } }>,
  ): Promise<void> {
    for (const item of items) {
      await this.set(item.key, item.value, item.options);
    }
  }

  async bulkDelete(keys: string[]): Promise<void> {
    await this.deleteMultiple(keys);
  }

  // Cache warming
  async warmCacheWithDefaults(): Promise<void> {
    // Warm up common cache entries
    await this.warmCache('user:preferences', async (key) => ({
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        budgetAlerts: true,
        goalAchievements: true,
        weeklyReports: false,
        monthlyReports: true,
      },
    }), 10);

    await this.warmCache('currency:rates', async (key) => ({
      USD: 1.0,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.0,
    }), 5);
  }
}
