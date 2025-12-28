import { Module } from '@nestjs/common';
import { SubscriptionController } from '../controllers/subscription.controller';
import { SubscriptionService } from '../../../application/services/subscription.service';
import { PrismaSubscriptionRepository } from '../../persistence/prisma/prisma-subscription.repository';
import { NotificationService } from '../../../application/services/notification.service';

@Module({
    controllers: [SubscriptionController],
    providers: [
        SubscriptionService,
        PrismaSubscriptionRepository,
        NotificationService,
    ],
})
export class SubscriptionsModule { }
