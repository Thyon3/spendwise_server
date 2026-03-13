import { Injectable } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class CustomLoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'expense-tracker-api' },
      transports: [
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }));
    }
  }

  log(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  error(message: string, trace?: string, meta?: any) {
    this.logger.error(message, { trace, ...meta });
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }

  verbose(message: string, meta?: any) {
    this.logger.verbose(message, meta);
  }

  // Custom methods for structured logging
  logUserAction(userId: string, action: string, details?: any) {
    this.logger.info('User action', {
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  logApiRequest(method: string, url: string, userId?: string, responseTime?: number) {
    this.logger.info('API request', {
      method,
      url,
      userId,
      responseTime,
      timestamp: new Date().toISOString(),
    });
  }

  logSecurityEvent(event: string, details: any) {
    this.logger.warn('Security event', {
      event,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  logPerformance(operation: string, duration: number, details?: any) {
    this.logger.info('Performance metric', {
      operation,
      duration,
      details,
      timestamp: new Date().toISOString(),
    });
  }
}
