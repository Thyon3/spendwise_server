import { Injectable } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
}

@Injectable()
export class RetryService {
  async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    const {
      maxAttempts,
      delay,
      maxDelay = 30000,
      backoffMultiplier = 2,
      retryCondition = this.defaultRetryCondition,
    } = options;

    let lastError: any;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts || !retryCondition(error)) {
          throw error;
        }

        console.warn(
          `Attempt ${attempt} failed, retrying in ${currentDelay}ms`,
          error.message
        );

        await this.sleep(currentDelay);
        currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError;
  }

  async executeWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    return this.execute(operation, {
      maxAttempts,
      delay: initialDelay,
      maxDelay: 30000,
      backoffMultiplier: 2,
    });
  }

  async executeWithLinearBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    return this.execute(operation, {
      maxAttempts,
      delay,
      maxDelay: 30000,
      backoffMultiplier: 1,
    });
  }

  private defaultRetryCondition(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.code === 'ECONNRESET' || 
        error.code === 'ENOTFOUND' || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT') {
      return true;
    }

    // Retry on HTTP 5xx errors
    if (error.response?.status >= 500) {
      return true;
    }

    // Retry on HTTP 429 (Too Many Requests)
    if (error.response?.status === 429) {
      return true;
    }

    // Don't retry on client errors (4xx except 429)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return false;
    }

    // Retry on unknown errors by default
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  createRetryPolicy(options: Partial<RetryOptions>) {
    const defaultOptions: RetryOptions = {
      maxAttempts: 3,
      delay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryCondition: this.defaultRetryCondition,
    };

    return { ...defaultOptions, ...options };
  }
}
