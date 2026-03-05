import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    console.log(`[${new Date().toISOString()}] [LOG] [${context || 'App'}] ${message}`);
  }

  error(message: string, trace?: string, context?: string) {
    console.error(`[${new Date().toISOString()}] [ERROR] [${context || 'App'}] ${message}`);
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: string, context?: string) {
    console.warn(`[${new Date().toISOString()}] [WARN] [${context || 'App'}] ${message}`);
  }

  debug(message: string, context?: string) {
    console.debug(`[${new Date().toISOString()}] [DEBUG] [${context || 'App'}] ${message}`);
  }

  verbose(message: string, context?: string) {
    console.log(`[${new Date().toISOString()}] [VERBOSE] [${context || 'App'}] ${message}`);
  }
}
