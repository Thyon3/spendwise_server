import { Module } from '@nestjs/common';
import { NotificationController } from '../controllers/notification.controller';
import { PrismaNotificationRepository } from '../../persistence/prisma/prisma-notification.repository';

@Module({
    controllers: [NotificationController],
    providers: [PrismaNotificationRepository],
    exports: [PrismaNotificationRepository],
})
export class NotificationsModule { }
