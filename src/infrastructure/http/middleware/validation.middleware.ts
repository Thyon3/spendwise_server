import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Validate request body size
    this.validateRequestBodySize(req);

    // Validate content type
    this.validateContentType(req);

    // Validate headers
    this.validateHeaders(req);

    // Sanitize input
    this.sanitizeInput(req);

    next();
  }

  private validateRequestBodySize(req: Request): void {
    const contentLength = req.headers['content-length'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength && parseInt(contentLength) > maxSize) {
      throw new HttpException(
        'Request body too large',
        HttpStatus.PAYLOAD_TOO_LARGE
      );
    }
  }

  private validateContentType(req: Request): void {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.headers['content-type'];

      if (!contentType) {
        throw new HttpException(
          'Content-Type header is required',
          HttpStatus.BAD_REQUEST
        );
      }

      const allowedTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
      ];

      const isValidType = allowedTypes.some(type =>
        contentType.toLowerCase().includes(type.toLowerCase())
      );

      if (!isValidType) {
        throw new HttpException(
          `Content-Type ${contentType} is not allowed`,
          HttpStatus.UNSUPPORTED_MEDIA_TYPE
        );
      }
    }
  }

  private validateHeaders(req: Request): void {
    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-originating-ip',
      'x-cluster-client-ip',
    ];

    for (const header of suspiciousHeaders) {
      const value = req.headers[header];
      if (value && typeof value === 'string') {
        // Validate IP format
        const ips = value.split(',').map(ip => ip.trim());
        for (const ip of ips) {
          if (!this.isValidIP(ip)) {
            throw new HttpException(
              `Invalid IP address in ${header}: ${ip}`,
              HttpStatus.BAD_REQUEST
            );
          }
        }
      }
    }

    // Validate User-Agent
    const userAgent = req.headers['user-agent'];
    if (userAgent && typeof userAgent === 'string') {
      if (userAgent.length > 500) {
        throw new HttpException(
          'User-Agent header too long',
          HttpStatus.BAD_REQUEST
        );
      }
    }
  }

  private sanitizeInput(req: Request): void {
    if (req.body) {
      this.sanitizeObject(req.body);
    }

    if (req.query) {
      this.sanitizeObject(req.query);
    }

    if (req.params) {
      this.sanitizeObject(req.params);
    }
  }

  private sanitizeObject(obj: any): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          // Remove potentially dangerous characters
          obj[key] = this.sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          this.sanitizeObject(value);
        }
      }
    }
  }

  private sanitizeString(str: string): string {
    // Remove null bytes
    let sanitized = str.replace(/\0/g, '');

    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Limit string length
    if (sanitized.length > 10000) {
      throw new HttpException(
        'Input string too long',
        HttpStatus.BAD_REQUEST
      );
    }

    return sanitized;
  }

  private isValidIP(ip: string): boolean {
    // IPv4 regex
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // IPv6 regex (simplified)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);

    // Remove server information
    res.removeHeader('Server');
    res.setHeader('X-Powered-By', 'Expense Tracker API');

    next();
  }
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Add request ID to request object
    (req as any).requestId = requestId;

    // Log request
    console.log(`[${requestId}] ${req.method} ${req.url} - ${req.ip}`);

    // Override res.end to log response
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);

      return originalEnd(chunk, encoding, cb);
    };

    next();
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private requests = new Map<string, { count: number; resetTime: number }>();

  use(req: Request, res: Response, next: NextFunction) {
    const clientId = this.getClientId(req);
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;

    const clientData = this.requests.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + windowMs,
      });

      this.setRateLimitHeaders(res, 1, maxRequests, clientData?.resetTime || now + windowMs);
      next();
      return;
    }

    if (clientData.count >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil((clientData.resetTime - now) / 1000).toString());
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      });
      return;
    }

    clientData.count++;
    this.setRateLimitHeaders(res, clientData.count, maxRequests, clientData.resetTime);
    next();
  }

  private getClientId(req: Request): string {
    return req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown';
  }

  private setRateLimitHeaders(res: Response, count: number, max: number, resetTime: number): void {
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
  }
}
