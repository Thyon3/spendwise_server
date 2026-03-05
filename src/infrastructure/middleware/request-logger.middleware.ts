import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const userAgent = req.get('user-agent') || 'unknown';

      const logMessage = {
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      };

      if (statusCode >= 400) {
        console.error('Request Error:', logMessage);
      } else {
        console.log('Request:', logMessage);
      }
    });

    next();
  }
}
