import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class AdvancedThrottlerGuard extends ThrottlerGuard {
  constructor(
    protected readonly reflector: Reflector,
    @Inject('THROTTLER_OPTIONS') private options: ThrottlerModuleOptions,
  ) {
    super(reflector, options);
  }

  protected getKey(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.connection.remoteAddress;
    const userId = (request.user as any)?.userId || 'anonymous';

    // Create a more sophisticated key that includes endpoint and user ID
    const endpoint = request.route?.path || request.path;
    return `${endpoint}:${userId}:${ip}`;
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use multiple factors for rate limiting
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';
    const userId = (req.user as any)?.userId || 'anonymous';

    // Create a hash that considers multiple factors
    const key = `${ip}:${userAgent}:${userId}`;
    return Buffer.from(key).toString('base64');
  }
}
