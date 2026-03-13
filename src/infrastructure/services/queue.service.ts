import { Injectable } from '@nestjs/common';

interface QueueItem<T> {
  id: string;
  data: T;
  priority: number;
  timestamp: Date;
}

@Injectable()
export class QueueService<T = any> {
  private queue: QueueItem<T>[] = [];
  private processing = false;

  async enqueue(data: T, priority: number = 0): Promise<string> {
    const id = `${Date.now()}-${Math.random()}`;
    const item: QueueItem<T> = {
      id,
      data,
      priority,
      timestamp: new Date(),
    };
    
    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);
    
    return id;
  }

  async dequeue(): Promise<QueueItem<T> | null> {
    return this.queue.shift() || null;
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }

  peek(): QueueItem<T> | null {
    return this.queue[0] || null;
  }
}
