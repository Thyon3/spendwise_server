import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com; frame-ancestors 'none';"
    );

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Frame protection
    res.setHeader('X-Frame-Options', 'DENY');

    // HSTS (only in production and HTTPS)
    if (process.env.NODE_ENV === 'production' && req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
    );

    // Remove server information
    res.removeHeader('Server');
    res.setHeader('Server', 'ExpenseTracker');

    // Custom security headers
    res.setHeader('X-Powered-By', 'ExpenseTracker');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    next();
  }
}

@Injectable()
export class ApiSecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Rate limiting headers
    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', '99');
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());

    // API version
    res.setHeader('API-Version', '1.0.0');

    // Cache control for API endpoints
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // CORS headers (additional to app-level CORS)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, API-Version');

    next();
  }
}
