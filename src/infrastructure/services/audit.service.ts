import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface AuditEvent {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'auth' | 'data' | 'system' | 'security' | 'business' | 'compliance';
  status: 'success' | 'failure' | 'warning';
  metadata?: Record<string, any>;
}

export interface AuditFilter {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  category?: string;
  severity?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'action' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditStats {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByStatus: Record<string, number>;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  topUsers: Array<{
    userId: string;
    count: number;
  }>;
  recentEvents: AuditEvent[];
  suspiciousActivities: AuditEvent[];
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly auditEvents = new Map<string, AuditEvent>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Store event (in real implementation, save to database)
    this.auditEvents.set(auditEvent.id, auditEvent);

    // Log to console for debugging
    this.logger.log(`Audit Event: ${auditEvent.action} - ${auditEvent.resource} - ${auditEvent.severity}`);

    // Send to external monitoring if configured
    if (this.configService.get('AUDIT_EXTERNAL_MONITORING')) {
      await this.sendToExternalMonitoring(auditEvent);
    }

    // Check for suspicious activity
    await this.checkSuspiciousActivity(auditEvent);

    return auditEvent;
  }

  async logAuthEvent(
    action: 'login' | 'logout' | 'register' | 'password_change' | 'password_reset' | '2fa_enabled' | '2fa_disabled',
    userId: string,
    details?: any,
    status: 'success' | 'failure' | 'warning' = 'success',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditEvent> {
    return this.logEvent({
      userId,
      action: `auth.${action}`,
      resource: 'user',
      resourceId: userId,
      ipAddress,
      userAgent,
      details,
      severity: this.getSeverityForAuthAction(action, status),
      category: 'auth',
      status,
      metadata: {
        authAction: action,
        ...details,
      },
    });
  }

  async logDataEvent(
    action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'import',
    resource: string,
    resourceId: string,
    userId: string,
    details?: any,
    status: 'success' | 'failure' | 'warning' = 'success',
  ): Promise<AuditEvent> {
    return this.logEvent({
      userId,
      action: `data.${action}`,
      resource,
      resourceId,
      details,
      severity: this.getSeverityForDataAction(action, status),
      category: 'data',
      status,
      metadata: {
        dataAction: action,
        resourceType: resource,
        ...details,
      },
    });
  }

  async logSystemEvent(
    action: string,
    details?: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    status: 'success' | 'failure' | 'warning' = 'success',
  ): Promise<AuditEvent> {
    return this.logEvent({
      action: `system.${action}`,
      resource: 'system',
      details,
      severity,
      category: 'system',
      status,
      metadata: {
        systemAction: action,
        ...details,
      },
    });
  }

  async logSecurityEvent(
    action: 'login_attempt' | 'permission_denied' | 'suspicious_activity' | 'data_breach' | 'firewall_block' | 'rate_limit_exceeded',
    userId?: string,
    details?: any,
    severity: 'medium' | 'high' | 'critical' = 'high',
    status: 'success' | 'failure' | 'warning' = 'warning',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuditEvent> {
    return this.logEvent({
      userId,
      action: `security.${action}`,
      resource: 'security',
      details,
      severity,
      category: 'security',
      status,
      ipAddress,
      userAgent,
      metadata: {
        securityAction: action,
        ...details,
      },
    });
  }

  async logBusinessEvent(
    action: string,
    resource: string,
    resourceId?: string,
    userId?: string,
    details?: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    status: 'success' | 'failure' | 'warning' = 'success',
  ): Promise<AuditEvent> {
    return this.logEvent({
      userId,
      action: `business.${action}`,
      resource,
      resourceId,
      details,
      severity,
      category: 'business',
      status,
      metadata: {
        businessAction: action,
        ...details,
      },
    });
  }

  async logComplianceEvent(
    action: 'gdpr_request' | 'data_retention' | 'audit_trail' | 'regulatory_report',
    resource: string,
    resourceId?: string,
    userId?: string,
    details?: any,
    severity: 'medium' | 'high' | 'critical' = 'high',
    status: 'success' | 'failure' | 'warning' = 'success',
  ): Promise<AuditEvent> {
    return this.logEvent({
      userId,
      action: `compliance.${action}`,
      resource,
      resourceId,
      details,
      severity,
      category: 'compliance',
      status,
      metadata: {
        complianceAction: action,
        ...details,
      },
    });
  }

  async getAuditEvents(filter: AuditFilter = {}): Promise<{
    events: AuditEvent[];
    total: number;
    hasMore: boolean;
  }> {
    let events = Array.from(this.auditEvents.values());

    // Apply filters
    if (filter.userId) {
      events = events.filter(event => event.userId === filter.userId);
    }
    if (filter.action) {
      events = events.filter(event => event.action.includes(filter.action));
    }
    if (filter.resource) {
      events = events.filter(event => event.resource === filter.resource);
    }
    if (filter.resourceId) {
      events = events.filter(event => event.resourceId === filter.resourceId);
    }
    if (filter.category) {
      events = events.filter(event => event.category === filter.category);
    }
    if (filter.severity) {
      events = events.filter(event => event.severity === filter.severity);
    }
    if (filter.status) {
      events = events.filter(event => event.status === filter.status);
    }
    if (filter.startDate) {
      events = events.filter(event => event.timestamp >= filter.startDate);
    }
    if (filter.endDate) {
      events = events.filter(event => event.timestamp <= filter.endDate);
    }
    if (filter.ipAddress) {
      events = events.filter(event => event.ipAddress === filter.ipAddress);
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
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    const paginatedEvents = events.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      events: paginatedEvents,
      total,
      hasMore,
    };
  }

  async getAuditEvent(eventId: string): Promise<AuditEvent | null> {
    return this.auditEvents.get(eventId) || null;
  }

  async getAuditStats(filter: AuditFilter = {}): Promise<AuditStats> {
    const { events } = await this.getAuditEvents(filter);

    const eventsByCategory: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const eventsByStatus: Record<string, number> = {};
    const actionCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();

    for (const event of events) {
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      eventsByStatus[event.status] = (eventsByStatus[event.status] || 0) + 1;
      
      actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);
      
      if (event.userId) {
        userCounts.set(event.userId, (userCounts.get(event.userId) || 0) + 1);
      }
    }

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topUsers = Array.from(userCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentEvents = events.slice(0, 10);
    const suspiciousActivities = events
      .filter(event => event.severity === 'critical' || event.category === 'security')
      .slice(0, 10);

    return {
      totalEvents: events.length,
      eventsByCategory,
      eventsBySeverity,
      eventsByStatus,
      topActions,
      topUsers,
      recentEvents,
      suspiciousActivities,
    };
  }

  async exportAuditEvents(filter: AuditFilter = {}, format: 'json' | 'csv' = 'json'): Promise<string> {
    const { events } = await this.getAuditEvents({ ...filter, limit: 10000 });

    if (format === 'csv') {
      const headers = [
        'ID',
        'Timestamp',
        'User ID',
        'Action',
        'Resource',
        'Resource ID',
        'IP Address',
        'Severity',
        'Category',
        'Status',
      ];
      
      const rows = events.map(event => [
        event.id,
        event.timestamp.toISOString(),
        event.userId || '',
        event.action,
        event.resource,
        event.resourceId || '',
        event.ipAddress || '',
        event.severity,
        event.category,
        event.status,
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    } else {
      return JSON.stringify(events, null, 2);
    }
  }

  async searchAuditEvents(query: string, filter: AuditFilter = {}): Promise<AuditEvent[]> {
    const { events } = await this.getAuditEvents(filter);
    const lowerQuery = query.toLowerCase();

    return events.filter(event =>
      event.action.toLowerCase().includes(lowerQuery) ||
      event.resource.toLowerCase().includes(lowerQuery) ||
      event.resourceId?.toLowerCase().includes(lowerQuery) ||
      event.userId?.toLowerCase().includes(lowerQuery) ||
      event.ipAddress?.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(event.details).toLowerCase().includes(lowerQuery)
    );
  }

  async getEventTimeline(resourceId: string, resource: string): Promise<AuditEvent[]> {
    const { events } = await this.getAuditEvents({
      resource,
      resourceId,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });

    return events;
  }

  async getUserActivity(userId: string, days: number = 30): Promise<{
    totalEvents: number;
    eventsByDay: Record<string, number>;
    eventsByCategory: Record<string, number>;
    recentEvents: AuditEvent[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { events } = await this.getAuditEvents({
      userId,
      startDate,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });

    const eventsByDay: Record<string, number> = {};
    const eventsByCategory: Record<string, number> = {};

    for (const event of events) {
      const day = event.timestamp.toISOString().split('T')[0];
      eventsByDay[day] = (eventsByDay[day] || 0) + 1;
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
    }

    return {
      totalEvents: events.length,
      eventsByDay,
      eventsByCategory,
      recentEvents: events.slice(0, 10),
    };
  }

  async getSecurityReport(days: number = 30): Promise<{
    totalSecurityEvents: number;
    eventsBySeverity: Record<string, number>;
    topIPAddresses: Array<{
      ipAddress: string;
      count: number;
    }>;
    suspiciousActivities: AuditEvent[];
    failedLogins: AuditEvent[];
    permissionDenials: AuditEvent[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { events } = await this.getAuditEvents({
      category: 'security',
      startDate,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });

    const eventsBySeverity: Record<string, number> = {};
    const ipCounts = new Map<string, number>();

    for (const event of events) {
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      
      if (event.ipAddress) {
        ipCounts.set(event.ipAddress, (ipCounts.get(event.ipAddress) || 0) + 1);
      }
    }

    const topIPAddresses = Array.from(ipCounts.entries())
      .map(([ipAddress, count]) => ({ ipAddress, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const suspiciousActivities = events.filter(event => event.severity === 'critical');
    const failedLogins = events.filter(event => event.action === 'security.login_attempt' && event.status === 'failure');
    const permissionDenials = events.filter(event => event.action === 'security.permission_denied');

    return {
      totalSecurityEvents: events.length,
      eventsBySeverity,
      topIPAddresses,
      suspiciousActivities,
      failedLogins,
      permissionDenials,
    };
  }

  async cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let deletedCount = 0;
    
    for (const [id, event] of this.auditEvents.entries()) {
      if (event.timestamp < cutoffDate) {
        this.auditEvents.delete(id);
        deletedCount++;
      }
    }

    this.logger.log(`Cleaned up ${deletedCount} old audit events`);
    return deletedCount;
  }

  private getSeverityForAuthAction(action: string, status: string): 'low' | 'medium' | 'high' | 'critical' {
    if (status === 'failure') {
      if (action === 'login' || action === 'password_reset') return 'high';
      return 'medium';
    }
    return 'low';
  }

  private getSeverityForDataAction(action: string, status: string): 'low' | 'medium' | 'high' | 'critical' {
    if (status === 'failure') {
      if (action === 'delete') return 'high';
      return 'medium';
    }
    if (action === 'delete') return 'medium';
    return 'low';
  }

  private async sendToExternalMonitoring(event: AuditEvent): Promise<void> {
    // In a real implementation, send to external monitoring service
    this.logger.log(`Sending audit event to external monitoring: ${event.id}`);
  }

  private async checkSuspiciousActivity(event: AuditEvent): Promise<void> {
    // Check for suspicious patterns
    if (event.category === 'security' && event.severity === 'critical') {
      this.logger.warn(`Suspicious activity detected: ${event.action} by user ${event.userId}`);
      
      // In a real implementation, trigger alerts, block IPs, etc.
      await this.triggerSecurityAlert(event);
    }

    // Check for multiple failed login attempts
    if (event.action === 'security.login_attempt' && event.status === 'failure') {
      const recentFailures = Array.from(this.auditEvents.values())
        .filter(e => 
          e.action === 'security.login_attempt' && 
          e.status === 'failure' && 
          e.ipAddress === event.ipAddress &&
          e.timestamp > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
        );

      if (recentFailures.length >= 5) {
        this.logger.warn(`Multiple failed login attempts from ${event.ipAddress}`);
        await this.triggerSecurityAlert(event);
      }
    }
  }

  private async triggerSecurityAlert(event: AuditEvent): Promise<void> {
    // In a real implementation, send security alerts
    this.logger.warn(`Security alert triggered for event: ${event.id}`);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Compliance methods
  async getGDPRComplianceReport(userId: string): Promise<{
    dataProcessingEvents: AuditEvent[];
    dataExportEvents: AuditEvent[];
    dataDeletionEvents: AuditEvent[];
    consentEvents: AuditEvent[];
    complianceScore: number;
  }> {
    const dataProcessingEvents = Array.from(this.auditEvents.values())
      .filter(event => event.userId === userId && event.category === 'data');

    const dataExportEvents = dataProcessingEvents.filter(event => 
      event.action.includes('export'));

    const dataDeletionEvents = dataProcessingEvents.filter(event => 
      event.action.includes('delete'));

    const consentEvents = Array.from(this.auditEvents.values())
      .filter(event => 
        event.userId === userId && 
        event.action.includes('consent')
      );

    // Simple compliance score calculation
    const complianceScore = Math.min(100, 
      (dataExportEvents.length > 0 ? 25 : 0) +
      (dataDeletionEvents.length > 0 ? 25 : 0) +
      (consentEvents.length > 0 ? 25 : 0) +
      (dataProcessingEvents.length > 0 ? 25 : 0)
    );

    return {
      dataProcessingEvents,
      dataExportEvents,
      dataDeletionEvents,
      consentEvents,
      complianceScore,
    };
  }

  async generateComplianceReport(period: 'daily' | 'weekly' | 'monthly'): Promise<{
    reportId: string;
    period: string;
    generatedAt: Date;
    summary: {
      totalEvents: number;
      eventsByCategory: Record<string, number>;
      eventsBySeverity: Record<string, number>;
      complianceScore: number;
      securityIncidents: number;
    };
    details: {
      authEvents: AuditEvent[];
      dataEvents: AuditEvent[];
      securityEvents: AuditEvent[];
      complianceEvents: AuditEvent[];
    };
  }> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const { events } = await this.getAuditEvents({ startDate });

    const authEvents = events.filter(event => event.category === 'auth');
    const dataEvents = events.filter(event => event.category === 'data');
    const securityEvents = events.filter(event => event.category === 'security');
    const complianceEvents = events.filter(event => event.category === 'compliance');

    const eventsByCategory: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    for (const event of events) {
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    }

    const securityIncidents = securityEvents.filter(event => event.severity === 'critical').length;
    const complianceScore = Math.max(0, 100 - (securityIncidents * 10));

    return {
      reportId: this.generateId(),
      period,
      generatedAt: now,
      summary: {
        totalEvents: events.length,
        eventsByCategory,
        eventsBySeverity,
        complianceScore,
        securityIncidents,
      },
      details: {
        authEvents,
        dataEvents,
        securityEvents,
        complianceEvents,
      },
    };
  }
}
