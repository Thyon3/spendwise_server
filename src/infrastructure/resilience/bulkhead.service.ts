import { Injectable } from '@nestjs/common';

export interface BulkheadOptions {
  maxConcurrent: number;
  maxQueue: number;
}

@Injectable()
export class BulkheadService {
  private bulkheads = new Map<string, Bulkhead>();

  create(name: string, options: BulkheadOptions): Bulkhead {
    const bulkhead = new Bulkhead(name, options);
    this.bulkheads.set(name, bulkhead);
    return bulkhead;
  }

  get(name: string): Bulkhead | undefined {
    return this.bulkheads.get(name);
  }

  async execute<T>(
    bulkheadName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const bulkhead = this.get(bulkheadName);

    if (!bulkhead) {
      throw new Error(`Bulkhead '${bulkheadName}' not found`);
    }

    return bulkhead.execute(operation);
  }

  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, bulkhead] of this.bulkheads) {
      stats[name] = bulkhead.getStats();
    }

    return stats;
  }
}

export class Bulkhead {
  private running = 0;
  private queue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void; operation: () => Promise<any> }> = [];
  private rejected = 0;

  constructor(
    private readonly name: string,
    private readonly options: BulkheadOptions,
  ) { }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.running < this.options.maxConcurrent) {
        this.runOperation(operation, resolve, reject);
      } else if (this.queue.length < this.options.maxQueue) {
        this.queue.push({ resolve, reject, operation });
      } else {
        this.rejected++;
        reject(new Error(`Bulkhead '${this.name}' queue is full`));
      }
    });
  }

  private async runOperation<T>(
    operation: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (reason?: any) => void
  ): Promise<void> {
    this.running++;

    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0 || this.running >= this.options.maxConcurrent) {
      return;
    }

    const { resolve, reject, operation } = this.queue.shift()!;
    this.runOperation(operation, resolve, reject);
  }

  getStats() {
    return {
      name: this.name,
      running: this.running,
      queueLength: this.queue.length,
      rejected: this.rejected,
      maxConcurrent: this.options.maxConcurrent,
      maxQueue: this.options.maxQueue,
    };
  }

  reset(): void {
    this.running = 0;
    this.rejected = 0;

    // Reject all queued operations
    while (this.queue.length > 0) {
      const { reject } = this.queue.shift()!;
      reject(new Error(`Bulkhead '${this.name}' was reset`));
    }
  }
}
