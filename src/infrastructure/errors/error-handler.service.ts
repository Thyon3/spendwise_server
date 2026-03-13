import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from '../logging/logger.service';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  message: string;
  stack?: string;
  statusCode: number;
  path: string;
  method: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  context?: Record<string, any>;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class ErrorHandlerService {
  private errorReports: Map<string, ErrorReport> = new Map();
  private errorThresholds = new Map<string, { count: number; timeWindow: number }>();

  constructor(private logger: CustomLoggerService) {}

  reportError(
    error: Error,
    request: any,
    context?: Record<string, any>
  ): string {
    const errorId = this.generateErrorId();
    
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date(),
      message: error.message,
      stack: error.stack,
      statusCode: this.extractStatusCode(error),
      path: request?.url || 'unknown',
      method: request?.method || 'unknown',
      userId: request?.user?.sub,
      userAgent: request?.headers?.['user-agent'],
      ip: request?.ip,
      context,
      resolved: false,
      severity: this.determineSeverity(error, context),
    };

    this.errorReports.set(errorId, errorReport);
    
    // Log the error
    this.logger.error(error.message, error.stack, {
      errorId,
      path: errorReport.path,
      method: errorReport.method,
      userId: errorReport.userId,
      severity: errorReport.severity,
    });

    // Check for error patterns and thresholds
    this.checkErrorThresholds(errorReport);

    return errorId;
  }

  getErrorReport(errorId: string): ErrorReport | undefined {
    return this.errorReports.get(errorId);
  }

  getAllErrors(
    filters?: {
      severity?: string;
      resolved?: boolean;
      userId?: string;
      timeRange?: { start: Date; end: Date };
    }
  ): ErrorReport[] {
    let errors = Array.from(this.errorReports.values());

    // Apply filters
    if (filters?.severity) {
      errors = errors.filter(error => error.severity === filters.severity);
    }

    if (filters?.resolved !== undefined) {
      errors = errors.filter(error => error.resolved === filters.resolved);
    }

    if (filters?.userId) {
      errors = errors.filter(error => error.userId === filters.userId);
    }

    if (filters?.timeRange) {
      errors = errors.filter(error => 
        error.timestamp >= filters.timeRange!.start && 
        error.timestamp <= filters.timeRange!.end
      );
    }

    return errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  resolveError(errorId: string): boolean {
    const errorReport = this.errorReports.get(errorId);
    if (!errorReport) {
      return false;
    }

    errorReport.resolved = true;
    this.logger.log(`Error resolved: ${errorId}`, { errorId });
    
    return true;
  }

  getErrorStatistics(): {
    total: number;
    resolved: number;
    unresolved: number;
    bySeverity: Record<string, number>;
    byPath: Record<string, number>;
    recentErrors: ErrorReport[];
  } {
    const errors = Array.from(this.errorReports.values());
    const resolved = errors.filter(e => e.resolved).length;
    const unresolved = errors.length - resolved;

    const bySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPath = errors.reduce((acc, error) => {
      acc[error.path] = (acc[error.path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentErrors = errors
      .filter(e => !e.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      total: errors.length,
      resolved,
      unresolved,
      bySeverity,
      byPath,
      recentErrors,
    };
  }

  setErrorThreshold(
    errorPattern: string,
    maxCount: number,
    timeWindowMs: number
  ): void {
    this.errorThresholds.set(errorPattern, { count: maxCount, timeWindow: timeWindowMs });
  }

  private checkErrorThresholds(errorReport: ErrorReport): void {
    for (const [pattern, threshold] of this.errorThresholds) {
      if (this.matchesPattern(errorReport.message, pattern)) {
        const recentErrors = this.getRecentErrors(pattern, threshold.timeWindow);
        
        if (recentErrors.length >= threshold.count) {
          this.logger.logSecurityEvent('ERROR_THRESHOLD_EXCEEDED', {
            pattern,
            count: recentErrors.length,
            threshold: threshold.count,
            timeWindow: threshold.timeWindow,
          });

          // Trigger alert or take action
          this.triggerErrorAlert(pattern, recentErrors);
        }
      }
    }
  }

  private matchesPattern(message: string, pattern: string): boolean {
    // Simple pattern matching - in production, you'd use regex
    return message.toLowerCase().includes(pattern.toLowerCase());
  }

  private getRecentErrors(pattern: string, timeWindowMs: number): ErrorReport[] {
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    
    return Array.from(this.errorReports.values())
      .filter(error => 
        error.timestamp >= cutoffTime && 
        this.matchesPattern(error.message, pattern)
      );
  }

  private triggerErrorAlert(pattern: string, errors: ErrorReport[]): void {
    // In production, this would send alerts via email, Slack, etc.
    this.logger.warn(`Error threshold exceeded for pattern: ${pattern}`, {
      errorCount: errors.length,
      errors: errors.map(e => ({ id: e.id, message: e.message, timestamp: e.timestamp })),
    });
  }

  private extractStatusCode(error: Error): number {
    if ('status' in error) {
      return (error as any).status;
    }
    
    if ('statusCode' in error) {
      return (error as any).statusCode;
    }

    // Default to 500 for unknown errors
    return 500;
  }

  private determineSeverity(error: Error, context?: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' {
    const statusCode = this.extractStatusCode(error);
    
    // Critical errors (5xx server errors)
    if (statusCode >= 500) {
      return 'critical';
    }

    // High severity (4xx client errors except 404)
    if (statusCode >= 400 && statusCode !== 404) {
      return 'high';
    }

    // Medium severity (404 not found)
    if (statusCode === 404) {
      return 'medium';
    }

    // Check error message patterns
    const message = error.message.toLowerCase();
    if (message.includes('database') || message.includes('connection')) {
      return 'critical';
    }

    if (message.includes('timeout') || message.includes('unauthorized')) {
      return 'high';
    }

    // Default to low severity
    return 'low';
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup old errors to prevent memory leaks
  cleanupOldErrors(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoffTime = new Date(Date.now() - maxAgeMs);
    let cleanedCount = 0;

    for (const [errorId, errorReport] of this.errorReports) {
      if (errorReport.timestamp < cutoffTime) {
        this.errorReports.delete(errorId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} old error reports`);
    }
  }

  exportErrors(format: 'json' | 'csv' = 'json'): string {
    const errors = Array.from(this.errorReports.values());

    if (format === 'json') {
      return JSON.stringify(errors, null, 2);
    } else {
      const headers = ['id', 'timestamp', 'message', 'statusCode', 'path', 'method', 'userId', 'severity', 'resolved'];
      const rows = errors.map(error => [
        error.id,
        error.timestamp.toISOString(),
        error.message,
        error.statusCode.toString(),
        error.path,
        error.method,
        error.userId || '',
        error.severity,
        error.resolved.toString(),
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }
}
