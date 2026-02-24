export class AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
