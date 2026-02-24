import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    relatedEntityId?: string,
    relatedEntityType?: string
  ) {
    console.log('Creating notification:', { userId, title, type });
    return { id: 'notification-id', title, message };
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    return [];
  }

  async markAsRead(notificationId: string, userId: string) {
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    return { success: true };
  }

  async deleteNotification(notificationId: string, userId: string) {
    return { success: true };
  }
}
