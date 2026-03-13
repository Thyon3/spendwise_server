import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../../services/rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rateLimitService: RateLimitService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get rate limit configuration from decorator or use defaults
    const rateLimitConfig = this.reflector.get('rateLimit', context.getHandler()) ||
      this.reflector.get('rateLimit', context.getClass()) ||
      { windowMs: 60000, max: 100 }; // Default: 100 requests per minute

    const identifier = this.getClientIdentifier(request);

    const result = await this.rateLimitService.checkLimit(
      identifier,
      rateLimitConfig.windowMs,
      rateLimitConfig.max,
    );

    // Set rate limit headers
    response.set({
      'X-RateLimit-Limit': rateLimitConfig.max.toString(),
      'X-RateLimit-Remaining': Math.max(0, rateLimitConfig.max - result.count).toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    });

    if (!result.allowed) {
      response.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
      throw new ForbiddenException('Rate limit exceeded');
    }

    return true;
  }

  private getClientIdentifier(request: any): string {
    // Use IP address as primary identifier
    const ip = request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      'unknown';

    // If user is authenticated, use user ID for more precise limiting
    if (request.user?.sub) {
      return `user:${request.user.sub}`;
    }

    return `ip:${ip}`;
  }
}
