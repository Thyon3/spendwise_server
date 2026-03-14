import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  totalRequests: number;
  windowMs: number;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  private readonly rateLimitMaps = new Map<string, Map<string, number>>();
  private readonly rateLimitConfigs = new Map<string, RateLimitConfig>();

  constructor(private readonly configService: ConfigService) {}

  createRateLimit(key: string, config: RateLimitConfig): void {
    this.rateLimitConfigs.set(key, config);
    this.rateLimitMaps.set(key, new Map<string, number>());
  }

  async checkRateLimit(
    key: string,
    identifier: string,
    config?: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const actualConfig = config || this.rateLimitConfigs.get(key);
    
    if (!actualConfig) {
      return {
        allowed: true,
        remaining: Number.MAX_SAFE_INTEGER,
        resetTime: new Date(),
        totalRequests: 0,
        windowMs: actualConfig?.windowMs || 60000,
      };
    }

    const now = Date.now();
    const windowStart = now - actualConfig.windowMs;
    const userRequests = this.rateLimitMaps.get(key);

    // Clean up old entries
    for (const [id, timestamp] of userRequests.entries()) {
      if (timestamp < windowStart) {
        userRequests.delete(id);
      }
    }

    // Get current request count
    const currentCount = userRequests.get(identifier) || 0;
    const totalRequests = userRequests.size;

    // Check if request is allowed
    const allowed = currentCount < actualConfig.maxRequests;
    const remaining = Math.max(0, actualConfig.maxRequests - currentCount);

    if (allowed) {
      // Record the request
      userRequests.set(identifier, now);
    }

    const result: RateLimitResult = {
      allowed,
      remaining,
      resetTime: new Date(now + actualConfig.windowMs),
      totalRequests,
      windowMs: actualConfig.windowMs,
    };

    // Log rate limit events
    if (!allowed) {
      this.logger.warn(`Rate limit exceeded for ${key}:${identifier}. Current: ${currentCount}, Max: ${actualConfig.maxRequests}`);
    }

    return result;
  }

  async checkUserRateLimit(userId: string, endpoint: string): Promise<RateLimitResult> {
    const key = `user:${endpoint}`;
    return this.checkRateLimit(key, userId);
  }

  async checkIPRateLimit(ip: string, endpoint: string): Promise<RateLimitResult> {
    const key = `ip:${endpoint}`;
    return this.checkRateLimit(key, ip);
  }

  async checkGlobalRateLimit(endpoint: string): Promise<RateLimitResult> {
    const key = `global:${endpoint}`;
    return this.checkRateLimit(key, 'global');
  }

  async checkApiKeyRateLimit(apiKey: string, endpoint: string): Promise<RateLimitResult> {
    const key = `api_key:${endpoint}`;
    return this.checkRateLimit(key, apiKey);
  }

  async checkCustomRateLimit(
    key: string,
    identifier: string,
    windowMs: number,
    maxRequests: number,
  ): Promise<RateLimitResult> {
    const config: RateLimitConfig = {
      windowMs,
      maxRequests,
    };
    return this.checkRateLimit(key, identifier, config);
  }

  getRateLimitStatus(key: string, identifier: string): {
    current: number;
    max: number;
    resetTime: Date;
    windowMs: number;
  } | null {
    const config = this.rateLimitConfigs.get(key);
    const userRequests = this.rateLimitMaps.get(key);

    if (!config || !userRequests) {
      return null;
    }

    const currentCount = userRequests.get(identifier) || 0;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean up old entries
    let actualCount = 0;
    for (const [id, timestamp] of userRequests.entries()) {
      if (timestamp >= windowStart) {
        actualCount++;
      }
    }

    return {
      current: actualCount,
      max: config.maxRequests,
      resetTime: new Date(now + config.windowMs),
      windowMs: config.windowMs,
    };
  }

  resetRateLimit(key: string, identifier?: string): void {
    const userRequests = this.rateLimitMaps.get(key);
    
    if (!userRequests) {
      return;
    }

    if (identifier) {
      userRequests.delete(identifier);
    } else {
      userRequests.clear();
    }
  }

  resetAllRateLimits(): void {
    this.rateLimitMaps.forEach((map) => map.clear());
  }

  getRateLimitStats(key: string): {
    totalUsers: number;
    totalRequests: number;
    averageRequestsPerUser: number;
    topUsers: Array<{
      identifier: string;
      requests: number;
    }>;
  } | null {
    const userRequests = this.rateLimitMaps.get(key);
    const config = this.rateLimitConfigs.get(key);

    if (!userRequests || !config) {
      return null;
    }

    const totalUsers = userRequests.size;
    const totalRequests = Array.from(userRequests.values()).reduce((sum, count) => sum + count, 0);
    const averageRequestsPerUser = totalUsers > 0 ? totalRequests / totalUsers : 0;

    // Get top users
    const topUsers = Array.from(userRequests.entries())
      .map(([identifier, requests]) => ({ identifier, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return {
      totalUsers,
      totalRequests,
      averageRequestsPerUser: Math.round(averageRequestsPerUser * 100) / 100,
      topUsers,
    };
  }

  getAllRateLimitStats(): Array<{
    key: string;
    stats: {
      totalUsers: number;
      totalRequests: number;
      averageRequestsPerUser: number;
      topUsers: Array<{
        identifier: string;
        requests: number;
      }>;
    };
  }> {
    const stats = [];

    for (const [key] of this.rateLimitConfigs.entries()) {
      const rateLimitStats = this.getRateLimitStats(key);
      if (rateLimitStats) {
        stats.push({
          key,
          stats: rateLimitStats,
        });
      }
    }

    return stats;
  }

  cleanupExpiredEntries(): void {
    const now = Date.now();

    for (const [key, userRequests] of this.rateLimitMaps.entries()) {
      const config = this.rateLimitConfigs.get(key);
      if (!config) continue;

      const windowStart = now - config.windowMs;
      for (const [id, timestamp] of userRequests.entries()) {
        if (timestamp < windowStart) {
          userRequests.delete(id);
        }
      }
    }
  }

  // Predefined rate limit configurations
  static readonly DEFAULT_LIMITS = {
    // API endpoints
    strict: {
      windowMs: 60000, // 1 minute
      maxRequests: 10,
    },
    moderate: {
      windowMs: 60000, // 1 minute
      maxRequests: 30,
    },
    lenient: {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    },
    // User-specific
    user: {
      windowMs: 60000, // 1 minute
      maxRequests: 60,
    },
    // File operations
    upload: {
      windowMs: 3600000, // 1 hour
      maxRequests: 10,
    },
    export: {
      windowMs: 86400000, // 24 hours
      maxRequests: 5,
    },
    // Authentication
    login: {
      windowMs: 900000, // 15 minutes
      maxRequests: 5,
    },
    passwordReset: {
      windowMs: 3600000, // 1 hour
      maxRequests: 3,
    },
    // Admin operations
    admin: {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    },
    // Global
    global: {
      windowMs: 60000, // 1 minute
      maxRequests: 1000,
    },
  };

  // Initialize default rate limits
  initializeDefaultRateLimits(): void {
    // API endpoints
    this.createRateLimit('api:strict', RateLimitService.DEFAULT_LIMITS.strict);
    this.createRateLimit('api:moderate', RateLimitService.DEFAULT_LIMITS.moderate);
    this.createRateLimit('api:lenient', RateLimitService.DEFAULT_LIMITS.lenient);
    
    // User-specific
    this.createRateLimit('user', RateLimitService.DEFAULT_LIMITS.user);
    
    // File operations
    this.createRateLimit('upload', RateLimitService.DEFAULT_LIMITS.upload);
    this.createRateLimit('export', RateLimitService.DEFAULT_LIMITS.export);
    
    // Authentication
    this.createRateLimit('login', RateLimitService.DEFAULT_LIMITS.login);
    this.createRateLimit('password-reset', RateLimitService.DEFAULT_LIMITS.passwordReset);
    
    // Admin operations
    this.createRateLimit('admin', RateLimitService.DEFAULT_LIMITS.admin);
    
    // Global
    this.createRateLimit('global', RateLimitService.DEFAULT_LIMITS.global);
  }

  // Custom key generators
  static generateUserKey(req: any): string {
    return `user:${req.user?.userId || req.ip}`;
  }

  static generateIPKey(req: any): string {
    return `ip:${req.ip}`;
  }

  static generateEndpointKey(req: any): string {
    return `endpoint:${req.route?.path || req.url}`;
  }

  static generateCombinedKey(req: any): string {
    const user = req.user?.userId || 'anonymous';
    const ip = req.ip || 'unknown';
    const endpoint = req.route?.path || req.url;
    return `${user}:${ip}:${endpoint}`;
  }

  // Adaptive rate limiting based on user tier or behavior
  async checkAdaptiveRateLimit(
    key: string,
    identifier: string,
    baseConfig: RateLimitConfig,
    userTier?: 'basic' | 'premium' | 'enterprise',
    userBehavior?: 'normal' | 'suspicious' | 'trusted',
  ): Promise<RateLimitResult> {
    const config = this.getAdaptiveConfig(baseConfig, userTier, userBehavior);
    return this.checkRateLimit(key, identifier, config);
  }

  private getAdaptiveConfig(
    baseConfig: RateLimitConfig,
    userTier?: 'basic' | 'premium' | 'enterprise',
    userBehavior?: 'normal' | 'suspicious' | 'trusted',
  ): RateLimitConfig {
    let config = { ...baseConfig };

    // Adjust based on user tier
    switch (userTier) {
      case 'premium':
        config.maxRequests = Math.floor(config.maxRequests * 2);
        break;
      case 'enterprise':
        config.maxRequests = Math.floor(config.maxRequests * 5);
        break;
    }

    // Adjust based on user behavior
    switch (userBehavior) {
      case 'suspicious':
        config.maxRequests = Math.floor(config.maxRequests * 0.5);
        config.windowMs = Math.floor(config.windowMs * 0.5);
        break;
      case 'trusted':
        config.maxRequests = Math.floor(config.maxRequests * 1.5);
        break;
    }

    return config;
  }

  // Rate limit with sliding window
  async checkSlidingWindowRateLimit(
    key: string,
    identifier: string,
    windowMs: number,
    maxRequests: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const userRequests = this.rateLimitMaps.get(key);

    if (!userRequests) {
      this.rateLimitMaps.set(key, new Map<string, number>());
      return this.checkRateLimit(key, identifier, { windowMs, maxRequests });
    }

    // Remove old entries
    for (const [id, timestamp] of userRequests.entries()) {
      if (timestamp < windowStart) {
        userRequests.delete(id);
      }
    }

    // Count requests in window
    let requestCount = 0;
    for (const timestamp of userRequests.values()) {
      if (timestamp >= windowStart) {
        requestCount++;
      }
    }

    const allowed = requestCount < maxRequests;
    const remaining = Math.max(0, maxRequests - requestCount);

    if (allowed) {
      userRequests.set(identifier, now);
    }

    return {
      allowed,
      remaining,
      resetTime: new Date(now + windowMs),
      totalRequests: requestCount,
      windowMs,
    };
  }

  // Rate limit with burst capacity
  async checkBurstRateLimit(
    key: string,
    identifier: string,
    windowMs: number,
    maxRequests: number,
    burstSize: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const userRequests = this.rateLimitMaps.get(key);

    if (!userRequests) {
      this.rateLimitMaps.set(key, new Map<string, number>());
      return this.checkRateLimit(key, identifier, { windowMs, maxRequests });
    }

    // Remove old entries
    for (const [id, timestamp] of userRequests.entries()) {
      if (timestamp < windowStart) {
        userRequests.delete(id);
      }
    }

    // Count requests in window
    let requestCount = 0;
    for (const timestamp of userRequests.values()) {
      if (timestamp >= windowStart) {
        requestCount++;
      }
    }

    // Allow burst if under normal limit
    const allowed = requestCount < maxRequests || (requestCount < maxRequests + burstSize);
    const remaining = Math.max(0, maxRequests - requestCount);

    if (allowed) {
      userRequests.set(identifier, now);
    }

    return {
      allowed,
      remaining,
      resetTime: new Date(now + windowMs),
      totalRequests: requestCount,
      windowMs,
    };
  }
}
