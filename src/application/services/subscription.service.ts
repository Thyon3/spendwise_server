import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { NotificationService } from './notification.service';

export interface SubscriptionCycle {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number;
}

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  monthlyTotal: number;
  yearlyTotal: number;
  upcomingRenewals: Array<{
    subscriptionId: string;
    name: string;
    nextBillingDate: Date;
    amount: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    totalAmount: number;
    count: number;
  }>;
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async createSubscription(userId: string, data: {
    name: string;
    description?: string;
    amount: number;
    currency: string;
    cycle: SubscriptionCycle;
    categoryId?: string;
    nextBillingDate: Date;
    isActive: boolean;
    autoRenew: boolean;
    paymentMethodId?: string;
    tags?: string[];
  }) {
    try {
      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          name: data.name,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          cycleType: data.cycle.type,
          cycleInterval: data.cycle.interval,
          categoryId: data.categoryId,
          nextBillingDate: data.nextBillingDate,
          isActive: data.isActive,
          autoRenew: data.autoRenew,
          paymentMethodId: data.paymentMethodId,
          tags: data.tags || [],
        },
      });

      // Schedule notification for next billing
      if (data.isActive && data.nextBillingDate) {
        await this.scheduleBillingReminder(subscription.id, data.nextBillingDate);
      }

      return subscription;
    } catch (error) {
      throw new HttpException(
        `Failed to create subscription: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateSubscription(userId: string, subscriptionId: string, data: Partial<{
    name: string;
    description: string;
    amount: number;
    currency: string;
    cycle: SubscriptionCycle;
    categoryId: string;
    nextBillingDate: Date;
    isActive: boolean;
    autoRenew: boolean;
    paymentMethodId: string;
    tags: string[];
  }>) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
    }

    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Reschedule notification if billing date changed
    if (data.nextBillingDate && data.isActive) {
      await this.scheduleBillingReminder(subscriptionId, data.nextBillingDate);
    }

    return updatedSubscription;
  }

  async deleteSubscription(userId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.subscription.delete({
      where: { id: subscriptionId },
    });

    return { message: 'Subscription deleted successfully' };
  }

  async getUserSubscriptions(userId: string, filters?: {
    isActive?: boolean;
    categoryId?: string;
    upcoming?: boolean; // upcoming billing in next 7 days
  }) {
    const whereClause: any = { userId };

    if (filters?.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    if (filters?.categoryId) {
      whereClause.categoryId = filters.categoryId;
    }

    if (filters?.upcoming) {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      whereClause.nextBillingDate = {
        lte: sevenDaysFromNow,
        gte: new Date(),
      };
    }

    return this.prisma.subscription.findMany({
      where: whereClause,
      include: {
        category: true,
        paymentMethod: true,
      },
      orderBy: {
        nextBillingDate: 'asc',
      },
    });
  }

  async getSubscriptionAnalytics(userId: string): Promise<SubscriptionAnalytics> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId, isActive: true },
      include: { category: true },
    });

    const monthlyTotal = subscriptions
      .filter(sub => this.isMonthlyCycle(sub.cycleType))
      .reduce((sum, sub) => sum + this.getMonthlyEquivalent(sub.amount, sub.cycleType, sub.cycleInterval), 0);

    const yearlyTotal = subscriptions
      .filter(sub => this.isYearlyCycle(sub.cycleType))
      .reduce((sum, sub) => sum + this.getYearlyEquivalent(sub.amount, sub.cycleType, sub.cycleInterval), 0);

    const upcomingRenewals = subscriptions
      .filter(sub => sub.nextBillingDate && sub.nextBillingDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      .map(sub => ({
        subscriptionId: sub.id,
        name: sub.name,
        nextBillingDate: sub.nextBillingDate!,
        amount: sub.amount,
      }))
      .sort((a, b) => a.nextBillingDate.getTime() - b.nextBillingDate.getTime());

    // Category breakdown
    const categoryMap = new Map<string, { totalAmount: number; count: number }>();
    subscriptions.forEach(sub => {
      const category = sub.category?.name || 'Uncategorized';
      const existing = categoryMap.get(category) || { totalAmount: 0, count: 0 };
      const monthlyAmount = this.getMonthlyEquivalent(sub.amount, sub.cycleType, sub.cycleInterval);
      categoryMap.set(category, {
        totalAmount: existing.totalAmount + monthlyAmount,
        count: existing.count + 1,
      });
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      totalSubscriptions: subscriptions.length,
      monthlyTotal,
      yearlyTotal,
      upcomingRenewals,
      categoryBreakdown,
    };
  }

  async processSubscriptionBilling(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { category: true },
    });

    if (!subscription || !subscription.isActive) {
      return;
    }

    try {
      // Create expense record for the billing
      await this.prisma.expense.create({
        data: {
          userId: subscription.userId,
          amount: subscription.amount,
          date: new Date(),
          description: `${subscription.name} - ${subscription.cycleType} subscription`,
          categoryId: subscription.categoryId,
          currency: subscription.currency,
          isRecurring: true,
          subscriptionId: subscription.id,
        },
      });

      // Update next billing date
      const nextBillingDate = this.calculateNextBillingDate(
        subscription.nextBillingDate,
        subscription.cycleType,
        subscription.cycleInterval
      );

      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          lastBillingDate: new Date(),
          nextBillingDate,
        },
      });

      // Send notification
      await this.notificationService.createNotification({
        userId: subscription.userId,
        title: 'Subscription Billed',
        message: `Your subscription "${subscription.name}" has been billed $${subscription.amount}`,
        type: 'billing',
        relatedEntityId: subscription.id,
        relatedEntityType: 'subscription',
      });

      // Schedule next billing reminder
      if (subscription.autoRenew) {
        await this.scheduleBillingReminder(subscriptionId, nextBillingDate);
      }

    } catch (error) {
      throw new HttpException(
        `Failed to process subscription billing: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cancelSubscription(userId: string, subscriptionId: string, reason?: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        isActive: false,
        autoRenew: false,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    // Send notification
    await this.notificationService.createNotification({
      userId,
      title: 'Subscription Cancelled',
      message: `Your subscription "${subscription.name}" has been cancelled`,
      type: 'subscription',
      relatedEntityId: subscription.id,
      relatedEntityType: 'subscription',
    });

    return { message: 'Subscription cancelled successfully' };
  }

  async pauseSubscription(userId: string, subscriptionId: string, pauseUntil?: Date) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        isActive: false,
        pausedAt: new Date(),
        resumeAt: pauseUntil,
      },
    });

    return { message: 'Subscription paused successfully' };
  }

  async resumeSubscription(userId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        isActive: true,
        pausedAt: null,
        resumeAt: null,
      },
    });

    return { message: 'Subscription resumed successfully' };
  }

  private async scheduleBillingReminder(subscriptionId: string, billingDate: Date) {
    // In a real implementation, this would use a job scheduler like Bull Queue
    // For now, we'll just create a notification record
    // The actual scheduling would be handled by a separate worker process
    
    const reminderDate = new Date(billingDate);
    reminderDate.setDate(reminderDate.getDate() - 3); // Remind 3 days before

    // This would be scheduled to run at reminderDate
    console.log(`Billing reminder scheduled for subscription ${subscriptionId} on ${reminderDate}`);
  }

  private calculateNextBillingDate(currentDate: Date, cycleType: string, interval: number): Date {
    const nextDate = new Date(currentDate);

    switch (cycleType) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * interval));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + (3 * interval));
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
    }

    return nextDate;
  }

  private isMonthlyCycle(cycleType: string): boolean {
    return ['daily', 'weekly', 'monthly'].includes(cycleType);
  }

  private isYearlyCycle(cycleType: string): boolean {
    return ['quarterly', 'yearly'].includes(cycleType);
  }

  private getMonthlyEquivalent(amount: number, cycleType: string, interval: number): number {
    switch (cycleType) {
      case 'daily':
        return amount * 30.44 * interval; // Average days in month
      case 'weekly':
        return amount * 4.33 * interval; // Average weeks in month
      case 'monthly':
        return amount * interval;
      case 'quarterly':
        return (amount * interval) / 3;
      case 'yearly':
        return (amount * interval) / 12;
      default:
        return amount;
    }
  }

  private getYearlyEquivalent(amount: number, cycleType: string, interval: number): number {
    switch (cycleType) {
      case 'daily':
        return amount * 365.25 * interval;
      case 'weekly':
        return amount * 52 * interval;
      case 'monthly':
        return amount * 12 * interval;
      case 'quarterly':
        return amount * 4 * interval;
      case 'yearly':
        return amount * interval;
      default:
        return amount;
    }
  }
}
