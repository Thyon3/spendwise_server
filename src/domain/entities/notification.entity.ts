export class Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
  createdAt: Date;
  readAt?: Date;
}

export enum NotificationType {
  BUDGET_ALERT = 'BUDGET_ALERT',
  RECURRING_REMINDER = 'RECURRING_REMINDER',
  GOAL_ACHIEVED = 'GOAL_ACHIEVED',
  EXPENSE_THRESHOLD = 'EXPENSE_THRESHOLD',
  PAYMENT_DUE = 'PAYMENT_DUE',
  SYSTEM = 'SYSTEM',
}
