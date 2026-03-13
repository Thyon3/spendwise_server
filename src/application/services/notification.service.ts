import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from '../../infrastructure/websockets/gateway/notifications.gateway';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationsGateway: NotificationsGateway,
    private readonly prisma: PrismaService,
  ) {}

  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data,
    });

    // Send real-time notification
    this.notificationsGateway.sendNotificationToUser(data.userId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt,
    });

    return notification;
  }

  async getNotifications(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
