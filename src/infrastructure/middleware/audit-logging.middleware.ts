import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuditLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditLoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, url, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const userId = (req as any).user?.userId || 'anonymous';

    // Log request start
    this.logger.log(`[${method}] ${url} - User: ${userId} - IP: ${ip} - UA: ${userAgent}`);

    // Capture response
    const originalSend = res.send;
    let responseBody: any;

    res.send = function (body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;

      const logData = {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        contentLength: `${contentLength}B`,
        userId,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      };

      if (statusCode >= 400) {
        this.logger.error(`Request failed: ${JSON.stringify(logData)}`);
      } else {
        this.logger.log(`Request completed: ${JSON.stringify(logData)}`);
      }
    });

    next();
  }
}
