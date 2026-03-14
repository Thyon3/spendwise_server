import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  type: 'page_view' | 'event' | 'conversion' | 'error' | 'performance';
  name: string;
  properties?: Record<string, any>;
  timestamp: Date;
  value?: number;
  currency?: string;
  category?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AnalyticsFilter {
  userId?: string;
  type?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'name' | 'value';
  sortOrder?: 'asc' | 'desc';
}

export interface AnalyticsStats {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  averageSessionDuration: number;
  topPages: Array<{
    page: string;
    views: number;
  }>;
  topEvents: Array<{
    name: string;
    count: number;
  }>;
  conversionRate: number;
  bounceRate: number;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  revenue: number;
  averageOrderValue: number;
}

export interface FunnelAnalysis {
  steps: Array<{
    name: string;
    count: number;
    conversionRate: number;
    dropOffRate: number;
  }>;
  overallConversionRate: number;
  totalEntries: number;
}

export interface UserAnalytics {
  userId: string;
  totalEvents: number;
  firstEvent: Date;
  lastEvent: Date;
  sessionCount: number;
  averageSessionDuration: number;
  topPages: Array<{
    page: string;
    views: number;
  }>;
  conversionEvents: number;
  totalValue: number;
  averageOrderValue: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly events = new Map<string, AnalyticsEvent>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<AnalyticsEvent> {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Store event (in real implementation, save to analytics database)
    this.events.set(analyticsEvent.id, analyticsEvent);

    // Send to external analytics service if configured
    if (this.configService.get('ANALYTICS_EXTERNAL_SERVICE')) {
      await this.sendToExternalAnalytics(analyticsEvent);
    }

    // Process real-time aggregations
    await this.processRealTimeAggregations(analyticsEvent);

    this.logger.log(`Analytics Event: ${analyticsEvent.type} - ${analyticsEvent.name}`);

    return analyticsEvent;
  }

  async trackPageView(
    userId: string,
    page: string,
    title?: string,
    referrer?: string,
    sessionId?: string,
    properties?: Record<string, any>,
  ): Promise<AnalyticsEvent> {
    return this.trackEvent({
      userId,
      type: 'page_view',
      name: page,
      properties: {
        title,
        referrer,
        ...properties,
      },
      sessionId,
    });
  }

  async trackEvent(
    userId: string,
    eventName: string,
    category?: string,
    value?: number,
    currency?: string,
    properties?: Record<string, any>,
  ): Promise<AnalyticsEvent> {
    return this.trackEvent({
      userId,
      type: 'event',
      name: eventName,
      category,
      value,
      currency,
      properties,
    });
  }

  async trackConversion(
    userId: string,
    eventName: string,
    value?: number,
    currency?: string,
    properties?: Record<string, any>,
  ): Promise<AnalyticsEvent> {
    return this.trackEvent({
      userId,
      type: 'conversion',
      name: eventName,
      value,
      currency,
      properties: {
        conversion: true,
        ...properties,
      },
    });
  }

  async trackError(
    userId: string,
    error: Error,
    context?: Record<string, any>,
  ): Promise<AnalyticsEvent> {
    return this.trackEvent({
      userId,
      type: 'error',
      name: error.name,
      properties: {
        message: error.message,
        stack: error.stack,
        context,
      },
    });
  }

  async trackPerformance(
    userId: string,
    metricName: string,
    value: number,
    unit?: string,
    properties?: Record<string, any>,
  ): Promise<AnalyticsEvent> {
    return this.trackEvent({
      userId,
      type: 'performance',
      name: metricName,
      value,
      properties: {
        unit: unit || 'ms',
        ...properties,
      },
    });
  }

  async getAnalytics(filter: AnalyticsFilter = {}): Promise<{
    events: AnalyticsEvent[];
    total: number;
    hasMore: boolean;
  }> {
    let events = Array.from(this.events.values());

    // Apply filters
    if (filter.userId) {
      events = events.filter(event => event.userId === filter.userId);
    }
    if (filter.type) {
      events = events.filter(event => event.type === filter.type);
    }
    if (filter.category) {
      events = events.filter(event => event.category === filter.category);
    }
    if (filter.startDate) {
      events = events.filter(event => event.timestamp >= filter.startDate);
    }
    if (filter.endDate) {
      events = events.filter(event => event.timestamp <= filter.endDate);
    }

    // Sort
    const sortBy = filter.sortBy || 'timestamp';
    const sortOrder = filter.sortOrder || 'desc';
    events.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Pagination
    const total = events.length;
    const limit = filter.limit || 100;
    const offset = filter.offset || 0;
    const paginatedEvents = events.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      events: paginatedEvents,
      total,
      hasMore,
    };
  }

  async getAnalyticsStats(filter: AnalyticsFilter = {}): Promise<AnalyticsStats> {
    const { events } = await this.getAnalytics(filter);
    const uniqueUsers = new Set(events.map(e => e.userId)).size;
    const uniqueSessions = new Set(events.map(e => e.sessionId)).size;

    // Calculate session duration
    const sessionDurations = new Map<string, number>();
    const sessionEvents = new Map<string, AnalyticsEvent[]>();

    for (const event of events) {
      if (event.sessionId) {
        if (!sessionEvents.has(event.sessionId)) {
          sessionEvents.set(event.sessionId, []);
        }
        sessionEvents.get(event.sessionId)!.push(event);
      }
    }

    for (const [sessionId, sessionEventList] of sessionEvents.entries()) {
      if (sessionEventList.length >= 2) {
        const firstEvent = sessionEventList[0];
        const lastEvent = sessionEventList[sessionEventList.length - 1];
        const duration = lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime();
        sessionDurations.set(sessionId, duration);
      }
    }

    const sessionDurationsArray = Array.from(sessionDurations.values());
    const averageSessionDuration = sessionDurationsArray.length > 0
        ? sessionDurationsArray.reduce((sum, duration) => sum + duration, 0) / sessionDurationsArray.length
        : 0;

    // Top pages
    const pageViews = events.filter(e => e.type === 'page_view');
    const pageCounts = new Map<string, number>();
    for (const pageView of pageViews) {
      pageCounts.set(pageView.name, (pageCounts.get(pageView.name) || 0) + 1);
    }

    const topPages = Array.from(pageCounts.entries())
      .map(([page, count]) => ({ page, views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Top events
    const eventCounts = new Map<string, number>();
    for (const event of events) {
      if (event.type === 'event') {
        eventCounts.set(event.name, (eventCounts.get(event.name) || 0) + 1);
      }
    }

    const topEvents = Array.from(eventCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Events by type
    const eventsByType: Record<string, number> = {};
    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }

    // Events by category
    const eventsByCategory: Record<string, number> = {};
    for (const event of events) {
      if (event.category) {
        eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      }
    }

    // Conversion metrics
    const conversionEvents = events.filter(e => e.type === 'conversion');
    const conversionRate = events.length > 0 ? (conversionEvents.length / events.length) * 100 : 0;
    const bounceRate = pageViews.length > 0 ? ((pageViews.length - uniqueUsers) / pageViews.length) * 100 : 0);

    // Revenue and order value
    const revenue = conversionEvents
      .reduce((sum, event) => sum + (event.value || 0), 0);
    const averageOrderValue = conversionEvents.length > 0
        ? revenue / conversionEvents.length
        : 0;

    return {
      totalEvents: events.length,
      uniqueUsers,
      uniqueSessions,
      averageSessionDuration,
      topPages,
      topEvents,
      conversionRate,
      bounceRate,
      eventsByType,
      eventsByCategory,
      revenue,
      averageOrderValue,
    };
  }

  async getUserAnalytics(userId: string, days: number = 30): Promise<UserAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { events } = await this.getAnalytics({
      userId,
      startDate,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });

    const firstEvent = events.length > 0 ? events[events.length - 1] : null;
    const lastEvent = events.length > 0 ? events[0] : null;

    // Session analysis
    const sessionEvents = new Map<string, AnalyticsEvent[]>();
    for (const event of events) {
      if (event.sessionId) {
        if (!sessionEvents.has(event.sessionId)) {
          sessionEvents.set(event.sessionId, []);
        }
        sessionEvents.get(event.sessionId)!.push(event);
      }
    }

    const sessionCount = sessionEvents.size;
    const sessionDurations = Array.from(sessionEvents.values()).map(sessionEvents => {
      if (sessionEvents.length >= 2) {
        const firstEvent = sessionEvents[0];
        const lastEvent = sessionEvents[sessionEvents.length - 1];
        return lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime();
      }
      return 0;
    });

    const averageSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
        : 0;

    // Page views
    const pageViews = events.filter(e => e.type === 'page_view');
    const pageCounts = new Map<string, number>();
    for (const pageView of pageViews) {
      pageCounts.set(pageView.name, (pageCounts.get(pageView.name) || 0) + 1);
    }

    const topPages = Array.from(pageCounts.entries())
      .map(([page, count]) => ({ page, views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Conversion analysis
    const conversionEvents = events.filter(e => e.type === 'conversion');
    const conversionEventsCount = conversionEvents.length;
    const totalValue = conversionEvents
      .reduce((sum, event) => sum + (event.value || 0), 0);
    const averageOrderValue = conversionEventsCount > 0 ? totalValue / conversionEventsCount : 0;

    return {
      userId,
      totalEvents: events.length,
      firstEvent: firstEvent?.timestamp,
      lastEvent: lastEvent?.timestamp,
      sessionCount,
      averageSessionDuration,
      topPages,
      conversionEvents: conversionEventsCount,
      totalValue,
      averageOrderValue,
    };
  }

  async getFunnelAnalysis(
    steps: string[],
    filter: AnalyticsFilter = {},
  ): Promise<FunnelAnalysis> {
    const { events } = await this.getAnalytics(filter);
    
    // Filter events that are part of the funnel
    const funnelEvents = events.filter(event => 
      event.type === 'event' && steps.includes(event.name)
    );

    // Calculate step metrics
    const stepMetrics = steps.map(step => {
      const stepEvents = funnelEvents.filter(e => e.name === step);
      const stepUsers = new Set(stepEvents.map(e => e.userId)).size;
      const totalUsers = new Set(funnelEvents.map(e => e.userId)).size;
      
      return {
        name: step,
        count: stepEvents.length,
        conversionRate: totalUsers > 0 ? (stepUsers / totalUsers) * 100 : 0,
        dropOffRate: 100 - ((stepUsers / totalUsers) * 100),
      };
    });

    const overallConversionRate = stepMetrics.length > 0
      ? stepMetrics[stepMetrics.length - 1].conversionRate
      : 0;

    return {
      steps: stepMetrics,
      overallConversionRate,
      totalEntries: funnelEvents.length,
    };
  }

  async getRetentionAnalytics(days: number = 30, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<{
    periods: Array<{
      period: string;
      newUsers: number;
      returningUsers: number;
      retentionRate: number;
    }>;
    averageRetentionRate: number;
  }> {
    const now = new Date();
    const periods: Array<{ start: Date; end: Date; label: string }> = [];

    // Generate periods
    switch (period) {
      case 'daily':
        for (let i = 0; i < days; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          periods.push({
            start: date,
            end: new Date(date.getTime() + 24 * 60 * 60 * 1000),
            label: date.toISOString().split('T')[0],
          });
        }
        break;
      case 'weekly':
        for (let i = 0; i < Math.ceil(days / 7); i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - (i * 7));
          periods.push({
            start: date,
            end: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000),
            label: `Week of ${date.toISOString().split('T')[0]}`,
          });
        }
        break;
      case 'monthly':
        for (let i = 0; i < Math.ceil(days / 30); i++) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          periods.push({
            start: new Date(date.getFullYear(), date.getMonth(), 1),
            end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
            label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          });
        }
        break;
    }

    const retentionData = periods.map(period => {
      const { events } = await this.getAnalytics({
        startDate: period.start,
        endDate: period.end,
      });

      const periodUsers = new Set(events.map(e => e.userId));
      const newUsers = new Set<string>();
      const returningUsers = new Set<string>();

      // Identify new vs returning users (simplified logic)
      for (const userId of periodUsers) {
        const userEvents = events.filter(e => e.userId === userId);
        if (userEvents.length === 1) {
          newUsers.add(userId);
        } else {
          returningUsers.add(userId);
        }
      }

      const retentionRate = periodUsers.size > 0
        ? (returningUsers.size / periodUsers.size) * 100
        : 0;

      return {
        period: period.label,
        newUsers: newUsers.size,
        returningUsers: returningUsers.size,
        retentionRate,
      };
    });

    const averageRetentionRate = retentionData.reduce((sum, data) => sum + data.retentionRate, 0) / retentionData.length;

    return {
      periods: retentionData,
      averageRetentionRate,
    };
  }

  async exportAnalytics(filter: AnalyticsFilter = {}, format: 'json' | 'csv' = 'json'): Promise<string> {
    const { events } = await this.getAnalytics(filter);

    if (format === 'csv') {
      const headers = [
        'ID', 'User ID', 'Type', 'Name', 'Timestamp', 'Value', 'Currency', 'Category', 'Session ID', 'User Agent', 'IP Address'
      ];
      
      const rows = events.map(event => [
        event.id,
        event.userId || '',
        event.type,
        event.name,
        event.timestamp.toISOString(),
        event.value?.toString() || '',
        event.currency || '',
        event.category || '',
        event.sessionId || '',
        event.userAgent || '',
        event.ipAddress || '',
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    } else {
      return JSON.stringify(events, null, 2);
    }
  }

  async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    currentSessions: number;
    eventsPerMinute: number;
    topPages: Array<{
      page: string;
      activeUsers: number;
    }>;
  }> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    const recentEvents = Array.from(this.events.values())
      .filter(event => event.timestamp >= oneMinuteAgo);

    const activeUsers = new Set(recentEvents.map(e => e.userId)).size;
    const currentSessions = new Set(recentEvents.map(e => e.sessionId)).size;
    const eventsPerMinute = recentEvents.length;

    // Top pages in last minute
    const pageViews = recentEvents.filter(e => e.type === 'page_view');
    const pageCounts = new Map<string, number>();
    for (const pageView of pageViews) {
      pageCounts.set(pageView.name, (pageCounts.get(pageView.name) || 0) + 1);
    }

    const topPages = Array.from(pageCounts.entries())
      .map(([page, count]) => ({ page, activeUsers: count }))
      .sort((a, b) => b.activeUsers - a.activeUsers)
      .slice(0, 10);

    return {
      activeUsers,
      currentSessions,
      eventsPerMinute,
      topPages,
    };
  }

  private async sendToExternalAnalytics(event: AnalyticsEvent): Promise<void> {
    // In a real implementation, send to Google Analytics, Mixpanel, etc.
    this.logger.log(`Sending analytics event to external service: ${event.id}`);
  }

  private async processRealTimeAggregations(event: AnalyticsEvent): Promise<void> {
    // In a real implementation, update real-time dashboards
    this.logger.log(`Processing real-time aggregations for event: ${event.id}`);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let deletedCount = 0;
    
    for (const [id, event] of this.events.entries()) {
      if (event.timestamp < cutoffDate) {
        this.events.delete(id);
        deletedCount++;
      }
    }

    this.logger.log(`Cleaned up ${deletedCount} old analytics events`);
    return deletedCount;
  }

  async generateReport(
    type: 'user_analytics' | 'funnel' | 'retention' | 'performance',
    filter?: AnalyticsFilter,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    switch (type) {
      case 'user_analytics':
        const userAnalytics = await this.getUserAnalytics(
          filter?.userId,
          filter?.days || 30
        );
        return format === 'csv'
          ? this.userAnalyticsToCSV(userAnalytics)
          : JSON.stringify(userAnalytics, null, 2);
      
      case 'funnel':
        const funnelAnalysis = await this.getFunnelAnalysis(
          ['landing', 'signup', 'payment', 'confirmation'],
          filter
        );
        return format === 'csv'
          ? this.funnelAnalysisToCSV(funnelAnalysis)
          : JSON.stringify(funnelAnalysis, null, 2);
      
      case 'retention':
        const retentionAnalytics = await this.getRetentionAnalytics(
          filter?.days || 30,
          filter?.period || 'daily'
        );
        return format === 'csv'
          ? this.retentionAnalyticsToCSV(retentionAnalytics)
          : JSON.stringify(retentionAnalytics, null, 2);
      
      case 'performance':
        const stats = await this.getAnalyticsStats(filter);
        return format === 'csv'
          ? this.statsToCSV(stats)
          : JSON.stringify(stats, null, 2);
      
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  private userAnalyticsToCSV(analytics: UserAnalytics): string {
    const headers = ['User ID', 'Total Events', 'Session Count', 'Avg Session Duration', 'Conversion Events', 'Total Value', 'Avg Order Value'];
    
    const rows = [[
      analytics.userId,
      analytics.totalEvents.toString(),
      analytics.sessionCount.toString(),
      analytics.averageSessionDuration.toString(),
      analytics.conversionEvents.toString(),
      analytics.totalValue.toString(),
      analytics.averageOrderValue.toString(),
    ]];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private funnelAnalysisToCSV(analysis: FunnelAnalysis): string {
    const headers = ['Step', 'Count', 'Conversion Rate (%)', 'Drop Off Rate (%)'];
    
    const rows = analysis.steps.map(step => [
      step.name,
      step.count.toString(),
      step.conversionRate.toFixed(2),
      step.dropOffRate.toFixed(2),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private retentionAnalyticsToCSV(analytics: any): string {
    const headers = ['Period', 'New Users', 'Returning Users', 'Retention Rate (%)'];
    
    const rows = analytics.periods.map(period => [
      period.period,
      period.newUsers.toString(),
      period.returningUsers.toString(),
      period.retentionRate.toFixed(2),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private statsToCSV(stats: AnalyticsStats): string {
    const headers = ['Total Events', 'Unique Users', 'Unique Sessions', 'Avg Session Duration', 'Conversion Rate (%)', 'Bounce Rate (%)', 'Revenue'];
    
    const rows = [[
      stats.totalEvents.toString(),
      stats.uniqueUsers.toString(),
      stats.uniqueSessions.toString(),
      stats.averageSessionDuration.toString(),
      stats.conversionRate.toFixed(2),
      stats.bounceRate.toFixed(2),
      stats.revenue.toString(),
    ]];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}
