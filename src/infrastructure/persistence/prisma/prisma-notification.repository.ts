import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaNotificationRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(userId: string, unreadOnly = false) {
        return this.prisma.notification.findMany({
            where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.prisma.notification.count({ where: { userId, isRead: false } });
    }

    async markAsRead(id: string, userId: string) {
        return this.prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true, readAt: new Date() },
        });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    }

    async delete(id: string, userId: string) {
        return this.prisma.notification.deleteMany({ where: { id, userId } });
    }

    async deleteAllRead(userId: string) {
        return this.prisma.notification.deleteMany({ where: { userId, isRead: true } });
    }
}
