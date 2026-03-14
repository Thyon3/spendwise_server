import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validApiKeys: string[];

  constructor(private configService: ConfigService) {
    const apiKeys = this.configService.get<string>('API_KEYS', '');
    this.validApiKeys = apiKeys.split(',').map(key => key.trim()).filter(Boolean);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    if (!this.isValidApiKey(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  private extractApiKey(request: Request): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'] as string;
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query parameter
    const apiKeyQuery = request.query.api_key as string;
    if (apiKeyQuery) {
      return apiKeyQuery;
    }

    return null;
  }

  private isValidApiKey(apiKey: string): boolean {
    return this.validApiKeys.includes(apiKey);
  }
}
