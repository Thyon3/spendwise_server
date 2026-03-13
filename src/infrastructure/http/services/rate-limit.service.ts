import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from '../../logging/logger.service';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  resetTime: number;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitService {
  private rateLimits = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private logger: CustomLoggerService) {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async checkLimit(
    identifier: string,
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.rateLimits.get(identifier);

    if (!entry || now > entry.resetTime) {
      // New window or expired window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
      };

      this.rateLimits.set(identifier, newEntry);

      return {
        allowed: true,
        count: 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Existing window
    const newCount = entry.count + 1;
    const allowed = newCount <= maxRequests;

    if (allowed) {
      entry.count = newCount;
    } else {
      this.logger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        identifier,
        count: newCount,
        maxRequests,
        windowMs,
      });
    }

    return {
      allowed,
      count: newCount,
      resetTime: entry.resetTime,
    };
  }

  async checkSlidingWindowLimit(
    identifier: string,
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // For sliding window, we'd need to store timestamps of individual requests
    // This is a simplified implementation using a fixed window
    return this.checkLimit(identifier, windowMs, maxRequests);
  }

  async checkTokenBucketLimit(
    identifier: string,
    capacity: number,
    refillRate: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.rateLimits.get(identifier);

    if (!entry) {
      // New bucket
      const newEntry: RateLimitEntry = {
        count: capacity - 1, // Consume one token
        resetTime: now + Math.ceil((1 / refillRate) * 1000), // Time to refill one token
      };

      this.rateLimits.set(identifier, newEntry);

      return {
        allowed: true,
        count: 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Calculate tokens to add based on time passed
    const timePassed = now - (entry.resetTime - Math.ceil((capacity - entry.count) / refillRate * 1000));
    const tokensToAdd = Math.floor(timePassed / 1000 * refillRate);
    const currentTokens = Math.min(capacity, entry.count + tokensToAdd);

    if (currentTokens > 0) {
      // Consume one token
      entry.count = currentTokens - 1;
      entry.resetTime = now + Math.ceil((1 / refillRate) * 1000);

      return {
        allowed: true,
        count: capacity - entry.count,
        resetTime: entry.resetTime,
      };
    } else {
      // No tokens available
      this.logger.logSecurityEvent('TOKEN_BUCKET_EXHAUSTED', {
        identifier,
        capacity,
        refillRate,
      });

      return {
        allowed: false,
        count: capacity,
        resetTime: now + Math.ceil((1 / refillRate) * 1000),
      };
    }
  }

  async resetLimit(identifier: string): Promise<void> {
    this.rateLimits.delete(identifier);
  }

  async getLimitStatus(identifier: string): Promise<RateLimitEntry | null> {
    const entry = this.rateLimits.get(identifier);
    
    if (!entry) {
      return null;
    }

    // Check if window has expired
    if (Date.now() > entry.resetTime) {
      this.rateLimits.delete(identifier);
      return null;
    }

    return { ...entry };
  }

  async getAllLimits(): Promise<Map<string, RateLimitEntry>> {
    this.cleanup(); // Remove expired entries
    return new Map(this.rateLimits);
  }

  async getStats(): Promise<{
    totalEntries: number;
    activeEntries: number;
    averageRequests: number;
    topClients: Array<{ identifier: string; count: number }>;
  }> {
    const now = Date.now();
    let activeEntries = 0;
    let totalRequests = 0;
    const clientCounts = new Map<string, number>();

    for (const [identifier, entry] of this.rateLimits) {
      if (now <= entry.resetTime) {
        activeEntries++;
        totalRequests += entry.count;
        clientCounts.set(identifier, entry.count);
      }
    }

    const topClients = Array.from(clientCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([identifier, count]) => ({ identifier, count }));

    return {
      totalEntries: this.rateLimits.size,
      activeEntries,
      averageRequests: activeEntries > 0 ? totalRequests / activeEntries : 0,
      topClients,
    };
  }

  async setCustomLimit(
    identifier: string,
    windowMs: number,
    maxRequests: number
  ): Promise<void> {
    const entry: RateLimitEntry = {
      count: 0,
      resetTime: Date.now() + windowMs,
    };

    this.rateLimits.set(identifier, entry);
  }

  async blockClient(identifier: string, durationMs: number): Promise<void> {
    const entry: RateLimitEntry = {
      count: Number.MAX_SAFE_INTEGER,
      resetTime: Date.now() + durationMs,
    };

    this.rateLimits.set(identifier, entry);
    
    this.logger.logSecurityEvent('CLIENT_BLOCKED', {
      identifier,
      durationMs,
    });
  }

  async unblockClient(identifier: string): Promise<void> {
    this.rateLimits.delete(identifier);
    
    this.logger.logSecurityEvent('CLIENT_UNBLOCKED', {
      identifier,
    });
  }

  async isBlocked(identifier: string): Promise<boolean> {
    const entry = this.rateLimits.get(identifier);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    
    if (now > entry.resetTime) {
      this.rateLimits.delete(identifier);
      return false;
    }

    return entry.count === Number.MAX_SAFE_INTEGER;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [identifier, entry] of this.rateLimits) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(identifier);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
