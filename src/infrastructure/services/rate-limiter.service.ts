import { Injectable } from '@nestjs/common';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

@Injectable()
export class RateLimiterService {
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 },
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const record = this.requestCounts.get(identifier);

    if (!record || now > record.resetTime) {
      // Create new window
      const resetTime = now + config.windowMs;
      this.requestCounts.set(identifier, { count: 1, resetTime });
      return { allowed: true, remaining: config.maxRequests - 1, resetTime };
    }

    if (record.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    // Increment count
    record.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  async resetLimit(identifier: string): Promise<void> {
    this.requestCounts.delete(identifier);
  }

  async cleanupExpired(): Promise<void> {
    const now = Date.now();
    for (const [key, value] of this.requestCounts.entries()) {
      if (now > value.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}
