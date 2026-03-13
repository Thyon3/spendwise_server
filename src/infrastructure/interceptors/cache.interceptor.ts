import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, any>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const cacheKey = this.generateCacheKey(context);
    
    // Check if cached response exists
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey));
    }

    return next.handle().pipe(
      tap(response => {
        // Cache the response
        this.cache.set(cacheKey, response);
      }),
    );
  }

  private generateCacheKey(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    return `${request.method}:${request.url}:${JSON.stringify(request.query)}`;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
