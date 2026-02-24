import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditLogService {
  async logAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue?: any,
    newValue?: any,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Log the action to database
    console.log('Audit log:', { userId, action, entityType, entityId });
  }

  async getUserLogs(userId: string, limit = 50) {
    return [];
  }

  async getEntityLogs(entityType: string, entityId: string) {
    return [];
  }
}
