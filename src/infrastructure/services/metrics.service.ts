import { Injectable } from '@nestjs/common';

export interface ApiMetric {
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  ip?: string;
}

export interface MetricSummary {
  totalRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
    avgResponseTime: number;
  }>;
  statusCodeDistribution: Record<number, number>;
  hourlyStats: Array<{
    hour: string;
    requests: number;
    avgResponseTime: number;
  }>;
}

@Injectable()
export class MetricsService {
  private metrics: ApiMetric[] = [];
  private readonly maxMetrics = 10000; // Keep last 10k metrics

  recordMetric(metric: ApiMetric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetricsSummary(timeRange?: '1h' | '24h' | '7d' | '30d'): MetricSummary {
    const now = new Date();
    const cutoffTime = this.getCutoffTime(now, timeRange || '24h');
    
    const filteredMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    
    if (filteredMetrics.length === 0) {
      return this.getEmptySummary();
    }

    const totalRequests = filteredMetrics.length;
    const averageResponseTime = filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    
    // Calculate requests per second
    const timeRangeMs = now.getTime() - cutoffTime.getTime();
    const requestsPerSecond = (totalRequests / timeRangeMs) * 1000;
    
    // Calculate error rate
    const errorCount = filteredMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;
    
    // Top endpoints
    const endpointStats = this.calculateEndpointStats(filteredMetrics);
    const topEndpoints = endpointStats
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Status code distribution
    const statusCodeDistribution = this.calculateStatusCodeDistribution(filteredMetrics);
    
    // Hourly stats
    const hourlyStats = this.calculateHourlyStats(filteredMetrics);
    
    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      topEndpoints,
      statusCodeDistribution,
      hourlyStats,
    };
  }

  getEndpointMetrics(endpoint: string, timeRange?: '1h' | '24h' | '7d' | '30d'): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    statusCodeDistribution: Record<number, number>;
    recentMetrics: ApiMetric[];
  } {
    const now = new Date();
    const cutoffTime = this.getCutoffTime(now, timeRange || '24h');
    
    const filteredMetrics = this.metrics.filter(
      m => m.endpoint === endpoint && m.timestamp >= cutoffTime
    );
    
    if (filteredMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        statusCodeDistribution: {},
        recentMetrics: [],
      };
    }

    const totalRequests = filteredMetrics.length;
    const averageResponseTime = filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const errorCount = filteredMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;
    const statusCodeDistribution = this.calculateStatusCodeDistribution(filteredMetrics);
    const recentMetrics = filteredMetrics.slice(-50); // Last 50 metrics

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      statusCodeDistribution,
      recentMetrics,
    };
  }

  getUserMetrics(userId: string, timeRange?: '1h' | '24h' | '7d' | '30d'): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    topEndpoints: Array<{
      endpoint: string;
      count: number;
    }>;
  } {
    const now = new Date();
    const cutoffTime = this.getCutoffTime(now, timeRange || '24h');
    
    const filteredMetrics = this.metrics.filter(
      m => m.userId === userId && m.timestamp >= cutoffTime
    );
    
    if (filteredMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        topEndpoints: [],
      };
    }

    const totalRequests = filteredMetrics.length;
    const averageResponseTime = filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const errorCount = filteredMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;
    
    // Top endpoints for this user
    const endpointCounts = new Map<string, number>();
    filteredMetrics.forEach(m => {
      endpointCounts.set(m.endpoint, (endpointCounts.get(m.endpoint) || 0) + 1);
    });
    
    const topEndpoints = Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      topEndpoints,
    };
  }

  getPerformanceMetrics(timeRange?: '1h' | '24h' | '7d' | '30d'): {
    p50: number;
    p95: number;
    p99: number;
    slowestRequests: ApiMetric[];
    fastestRequests: ApiMetric[];
  } {
    const now = new Date();
    const cutoffTime = this.getCutoffTime(now, timeRange || '24h');
    
    const filteredMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    const responseTimes = filteredMetrics.map(m => m.responseTime).sort((a, b) => a - b);
    
    if (responseTimes.length === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        slowestRequests: [],
        fastestRequests: [],
      };
    }

    const p50 = this.calculatePercentile(responseTimes, 50);
    const p95 = this.calculatePercentile(responseTimes, 95);
    const p99 = this.calculatePercentile(responseTimes, 99);
    
    const slowestRequests = filteredMetrics
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);
    
    const fastestRequests = filteredMetrics
      .sort((a, b) => a.responseTime - b.responseTime)
      .slice(0, 10);

    return {
      p50: Math.round(p50 * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100,
      slowestRequests,
      fastestRequests,
    };
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  getMetricsCount(): number {
    return this.metrics.length;
  }

  private getCutoffTime(now: Date, timeRange: string): Date {
    const cutoff = new Date(now);
    
    switch (timeRange) {
      case '1h':
        cutoff.setHours(cutoff.getHours() - 1);
        break;
      case '24h':
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case '7d':
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(cutoff.getDate() - 30);
        break;
    }
    
    return cutoff;
  }

  private getEmptySummary(): MetricSummary {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      topEndpoints: [],
      statusCodeDistribution: {},
      hourlyStats: [],
    };
  }

  private calculateEndpointStats(metrics: ApiMetric[]): Array<{
    endpoint: string;
    count: number;
    avgResponseTime: number;
  }> {
    const endpointMap = new Map<string, { count: number; totalTime: number }>();
    
    metrics.forEach(m => {
      const existing = endpointMap.get(m.endpoint) || { count: 0, totalTime: 0 };
      endpointMap.set(m.endpoint, {
        count: existing.count + 1,
        totalTime: existing.totalTime + m.responseTime,
      });
    });
    
    return Array.from(endpointMap.entries()).map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      avgResponseTime: Math.round((stats.totalTime / stats.count) * 100) / 100,
    }));
  }

  private calculateStatusCodeDistribution(metrics: ApiMetric[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    
    metrics.forEach(m => {
      distribution[m.statusCode] = (distribution[m.statusCode] || 0) + 1;
    });
    
    return distribution;
  }

  private calculateHourlyStats(metrics: ApiMetric[]): Array<{
    hour: string;
    requests: number;
    avgResponseTime: number;
  }> {
    const hourlyMap = new Map<string, { count: number; totalTime: number }>();
    
    metrics.forEach(m => {
      const hour = m.timestamp.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      const existing = hourlyMap.get(hour) || { count: 0, totalTime: 0 };
      hourlyMap.set(hour, {
        count: existing.count + 1,
        totalTime: existing.totalTime + m.responseTime,
      });
    });
    
    return Array.from(hourlyMap.entries())
      .map(([hour, stats]) => ({
        hour,
        requests: stats.count,
        avgResponseTime: Math.round((stats.totalTime / stats.count) * 100) / 100,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }
}
