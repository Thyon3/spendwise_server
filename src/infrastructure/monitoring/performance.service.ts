import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from '../logging/logger.service';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

@Injectable()
export class PerformanceService {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private timers: Map<string, number> = new Map();
  
  private readonly thresholds: PerformanceThreshold[] = [
    { metric: 'response_time', warning: 1000, critical: 3000, unit: 'ms' },
    { metric: 'memory_usage', warning: 80, critical: 95, unit: '%' },
    { metric: 'cpu_usage', warning: 70, critical: 90, unit: '%' },
    { metric: 'error_rate', warning: 5, critical: 10, unit: '%' },
    { metric: 'throughput', warning: 100, critical: 50, unit: 'req/s' },
  ];

  constructor(private logger: CustomLoggerService) {}

  startTimer(name: string): string {
    const timerId = `${name}_${Date.now()}_${Math.random()}`;
    this.timers.set(timerId, Date.now());
    return timerId;
  }

  endTimer(timerId: string, metricName?: string): number {
    const startTime = this.timers.get(timerId);
    if (!startTime) {
      throw new Error(`Timer ${timerId} not found`);
    }

    const duration = Date.now() - startTime;
    this.timers.delete(timerId);

    const name = metricName || timerId.split('_')[0];
    this.recordMetric(name, duration, 'ms');

    return duration;
  }

  recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricList = this.metrics.get(name)!;
    metricList.push(metric);

    // Keep only last 1000 metrics per type to prevent memory leaks
    if (metricList.length > 1000) {
      metricList.shift();
    }

    // Check thresholds
    this.checkThresholds(metric);
  }

  recordApiResponseTime(route: string, duration: number, statusCode: number) {
    const tags = {
      route,
      status_code: statusCode.toString(),
      status_category: statusCode < 400 ? 'success' : 'error',
    };

    this.recordMetric('api_response_time', duration, 'ms', tags);
    
    if (statusCode >= 400) {
      this.recordMetric('api_error_count', 1, 'count', tags);
    }
  }

  recordDatabaseQuery(query: string, duration: number, success: boolean) {
    const tags = {
      query_type: this.getQueryType(query),
      success: success.toString(),
    };

    this.recordMetric('db_query_time', duration, 'ms', tags);
    
    if (!success) {
      this.recordMetric('db_error_count', 1, 'count', tags);
    }
  }

  recordMemoryUsage() {
    const usage = process.memoryUsage();
    
    this.recordMetric('memory_rss', usage.rss, 'bytes');
    this.recordMetric('memory_heap_used', usage.heapUsed, 'bytes');
    this.recordMetric('memory_heap_total', usage.heapTotal, 'bytes');
    this.recordMetric('memory_external', usage.external, 'bytes');
    
    // Calculate memory usage percentage
    const totalMemory = usage.heapTotal;
    const usedMemory = usage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    this.recordMetric('memory_usage', memoryUsagePercent, '%');
  }

  recordCpuUsage() {
    const cpuUsage = process.cpuUsage();
    const userCpuPercent = (cpuUsage.user / 1000000) * 100; // Convert to percentage
    const systemCpuPercent = (cpuUsage.system / 1000000) * 100;
    
    this.recordMetric('cpu_user', userCpuPercent, '%');
    this.recordMetric('cpu_system', systemCpuPercent, '%');
    this.recordMetric('cpu_usage', userCpuPercent + systemCpuPercent, '%');
  }

  recordErrorRate(totalRequests: number, errorRequests: number) {
    const errorRate = (errorRequests / totalRequests) * 100;
    this.recordMetric('error_rate', errorRate, '%');
  }

  recordThroughput(requestsPerSecond: number) {
    this.recordMetric('throughput', requestsPerSecond, 'req/s');
  }

  getMetrics(name?: string, timeRange?: { start: Date; end: Date }): PerformanceMetric[] {
    if (name) {
      const metrics = this.metrics.get(name) || [];
      return this.filterByTimeRange(metrics, timeRange);
    }

    const allMetrics: PerformanceMetric[] = [];
    for (const metricList of this.metrics.values()) {
      allMetrics.push(...this.filterByTimeRange(metricList, timeRange));
    }

    return allMetrics;
  }

  getMetricSummary(name: string, timeRange?: { start: Date; end: Date }) {
    const metrics = this.getMetrics(name, timeRange);
    
    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value);
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      name,
      count: metrics.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      unit: metrics[0].unit,
      latest: metrics[metrics.length - 1],
    };
  }

  getHealthStatus(): { status: 'healthy' | 'warning' | 'critical'; issues: string[] } {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    for (const threshold of this.thresholds) {
      const summary = this.getMetricSummary(threshold.metric);
      
      if (summary) {
        const latestValue = summary.latest.value;
        
        if (latestValue >= threshold.critical) {
          status = 'critical';
          issues.push(`${threshold.metric} is critical: ${latestValue}${threshold.unit} (threshold: ${threshold.critical}${threshold.unit})`);
        } else if (latestValue >= threshold.warning) {
          if (status !== 'critical') {
            status = 'warning';
          }
          issues.push(`${threshold.metric} is elevated: ${latestValue}${threshold.unit} (threshold: ${threshold.warning}${threshold.unit})`);
        }
      }
    }

    return { status, issues };
  }

  getSystemMetrics() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      uptime_seconds: uptime,
      uptime_formatted: this.formatUptime(uptime),
      memory: {
        rss: memoryUsage.rss,
        heap_used: memoryUsage.heapUsed,
        heap_total: memoryUsage.heapTotal,
        external: memoryUsage.external,
        heap_used_percent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        user_percent: (cpuUsage.user / 1000000) * 100,
        system_percent: (cpuUsage.system / 1000000) * 100,
        total_percent: ((cpuUsage.user + cpuUsage.system) / 1000000) * 100,
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  clearMetrics(name?: string) {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const allMetrics: PerformanceMetric[] = [];
    
    for (const metricList of this.metrics.values()) {
      allMetrics.push(...metricList);
    }

    if (format === 'json') {
      return JSON.stringify(allMetrics, null, 2);
    } else {
      // CSV format
      const headers = ['name', 'value', 'unit', 'timestamp', 'tags'];
      const rows = allMetrics.map(metric => [
        metric.name,
        metric.value.toString(),
        metric.unit,
        metric.timestamp.toISOString(),
        JSON.stringify(metric.tags || {}),
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }

  private checkThresholds(metric: PerformanceMetric) {
    const threshold = this.thresholds.find(t => t.metric === metric.name);
    
    if (!threshold) {
      return;
    }

    if (metric.value >= threshold.critical) {
      this.logger.logPerformance(metric.name, metric.value, {
        level: 'critical',
        threshold: threshold.critical,
        unit: threshold.unit,
        tags: metric.tags,
      });
    } else if (metric.value >= threshold.warning) {
      this.logger.logPerformance(metric.name, metric.value, {
        level: 'warning',
        threshold: threshold.warning,
        unit: threshold.unit,
        tags: metric.tags,
      });
    }
  }

  private getQueryType(query: string): string {
    const trimmed = query.trim().toLowerCase();
    
    if (trimmed.startsWith('select')) return 'select';
    if (trimmed.startsWith('insert')) return 'insert';
    if (trimmed.startsWith('update')) return 'update';
    if (trimmed.startsWith('delete')) return 'delete';
    if (trimmed.startsWith('create')) return 'create';
    if (trimmed.startsWith('drop')) return 'drop';
    if (trimmed.startsWith('alter')) return 'alter';
    
    return 'other';
  }

  private filterByTimeRange(metrics: PerformanceMetric[], timeRange?: { start: Date; end: Date }): PerformanceMetric[] {
    if (!timeRange) {
      return metrics;
    }

    return metrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  // Decorator for automatic performance tracking
  static trackPerformance(metricName?: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const performanceService = this.performanceService as PerformanceService;
        const timerId = performanceService.startTimer(metricName || propertyName);
        
        try {
          const result = await method.apply(this, args);
          performanceService.endTimer(timerId);
          return result;
        } catch (error) {
          performanceService.endTimer(timerId);
          throw error;
        }
      };

      return descriptor;
    };
  }
}
