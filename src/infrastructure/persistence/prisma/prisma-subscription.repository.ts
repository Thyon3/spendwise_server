import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaSubscriptionRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, data: any) {
        return this.prisma.subscription.create({
            data: {
                userId,
                name: data.name,
                provider: data.provider,
                amount: data.amount,
                currency: data.currency,
                billingCycle: data.billingCycle,
                startDate: new Date(data.startDate),
                nextBillingDate: new Date(data.nextBillingDate),
                endDate: data.endDate ? new Date(data.endDate) : undefined,
                categoryId: data.categoryId,
                reminderDays: data.reminderDays ?? 3,
            },
        });
    }

    async findAll(userId: string, filters?: { isActive?: boolean; upcoming?: boolean }) {
        const where: any = { userId };
        if (filters?.isActive !== undefined) where.isActive = filters.isActive;
        if (filters?.upcoming) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() + 7);
            where.nextBillingDate = { lte: cutoff, gte: new Date() };
        }
        return this.prisma.subscription.findMany({
            where,
            orderBy: { nextBillingDate: 'asc' },
        });
    }

    async findById(id: string, userId: string) {
        const found = await this.prisma.subscription.findFirst({ where: { id, userId } });
        if (!found) throw new NotFoundException('Subscription not found');
        return found;
    }

    async update(id: string, userId: string, data: any) {
        await this.findById(id, userId);
        return this.prisma.subscription.update({
            where: { id },
            data: {
                name: data.name,
                amount: data.amount,
                nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
                isActive: data.isActive,
                reminderDays: data.reminderDays,
            },
        });
    }

    async delete(id: string, userId: string) {
        await this.findById(id, userId);
        await this.prisma.subscription.delete({ where: { id } });
    }

    async getAnalytics(userId: string) {
        const subs = await this.prisma.subscription.findMany({ where: { userId, isActive: true } });
        const toMonthly = (s: any) => s.billingCycle === 'YEARLY' ? s.amount / 12 : s.billingCycle === 'WEEKLY' ? s.amount * 4.33 : s.amount;
        const monthlyTotal = subs.reduce((sum, s) => sum + toMonthly(s), 0);
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 7);
        const upcoming = subs.filter(s => s.nextBillingDate <= cutoff);
        return { total: subs.length, monthlyTotal, yearlyTotal: monthlyTotal * 12, upcoming };
    }
}
