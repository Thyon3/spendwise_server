import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ResponseCacheInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);

    // Check if we have a valid cached response
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // Return cached response
      request.cachedResponse = cached.data;
      return new Observable(observer => {
        observer.next(cached.data);
        observer.complete();
      });
    }

    // Proceed with request and cache response
    return next.handle().pipe(
      tap(response => {
        // Cache successful GET requests
        if (request.method === 'GET' && request.cacheable !== false) {
          const ttl = this.getTTL(request);
          this.cache.set(cacheKey, {
            data: response,
            timestamp: Date.now(),
            ttl,
          });
        }
      })
    );
  }

  private generateCacheKey(request: any): string {
    const { method, url, query, headers } = request;
    const userId = (request as any).user?.userId || 'anonymous';
    const key = `${method}:${url}:${JSON.stringify(query)}:${userId}`;
    return Buffer.from(key).toString('base64');
  }

  private getTTL(request: any): number {
    // Default TTL: 5 minutes
    let ttl = 5 * 60 * 1000;

    // Adjust TTL based on endpoint
    if (request.url.includes('/analytics')) {
      ttl = 10 * 60 * 1000; // 10 minutes for analytics
    } else if (request.url.includes('/reports')) {
      ttl = 30 * 60 * 1000; // 30 minutes for reports
    } else if (request.url.includes('/currency')) {
      ttl = 60 * 60 * 1000; // 1 hour for currency rates
    }

    return ttl;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear cache entries matching pattern
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
