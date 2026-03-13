import { Injectable } from '@nestjs/common';

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface MetricSummary {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

@Injectable()
export class MetricsService {
  private metrics: Map<string, Metric[]> = new Map();

  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      labels,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricList = this.metrics.get(name)!;
    metricList.push(metric);

    // Keep only last 1000 metrics per type
    if (metricList.length > 1000) {
      metricList.shift();
    }
  }

  getMetrics(name?: string, timeRange?: { start: Date; end: Date }): Metric[] {
    if (name) {
      const metrics = this.metrics.get(name) || [];
      return this.filterByTimeRange(metrics, timeRange);
    }

    const allMetrics: Metric[] = [];
    for (const metricList of this.metrics.values()) {
      allMetrics.push(...this.filterByTimeRange(metricList, timeRange));
    }

    return allMetrics;
  }

  getMetricSummary(name: string, timeRange?: { start: Date; end: Date }): MetricSummary | null {
    const metrics = this.getMetrics(name, timeRange);
    
    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    
    return {
      count: metrics.length,
      sum: values.reduce((sum, val) => sum + val, 0),
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }

  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.recordMetric(`${name}_counter`, value, labels);
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(`${name}_histogram`, value, labels);
  }

  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(`${name}_gauge`, value, labels);
  }

  private filterByTimeRange(metrics: Metric[], timeRange?: { start: Date; end: Date }): Metric[] {
    if (!timeRange) {
      return metrics;
    }

    return metrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }
}
