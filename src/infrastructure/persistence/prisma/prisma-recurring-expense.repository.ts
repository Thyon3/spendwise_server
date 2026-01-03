import { Injectable } from '@nestjs/common';
import { IRecurringExpenseRepository } from '../../../../domain/repositories/recurring-expense.repository.interface';
import { RecurringExpense, RecurrenceType } from '../../../../domain/entities/recurring-expense.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaRecurringExpenseRepository implements IRecurringExpenseRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<RecurringExpense>): Promise<RecurringExpense> {
        const created = await this.prisma.recurringExpense.create({
            data: {
                amount: data.amount!,
                currency: data.currency!,
                description: data.description,
                userId: data.userId!,
                categoryId: data.categoryId!,
                recurrenceType: data.recurrenceType!,
                interval: data.interval!,
                startDate: data.startDate!,
                endDate: data.endDate,
                isActive: data.isActive ?? true,
            },
        });
        return new RecurringExpense(created as any);
    }

    async update(id: string, data: Partial<RecurringExpense>): Promise<RecurringExpense> {
        const updated = await this.prisma.recurringExpense.update({
            where: { id },
            data: {
                amount: data.amount,
                currency: data.currency,
                description: data.description,
                categoryId: data.categoryId,
                recurrenceType: data.recurrenceType,
                interval: data.interval,
                startDate: data.startDate,
                endDate: data.endDate,
                isActive: data.isActive,
                lastGenerated: data.lastGeneratedDate,
            },
        });
        return new RecurringExpense(updated as any);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.recurringExpense.delete({ where: { id } });
    }

    async findById(id: string): Promise<RecurringExpense | null> {
        const found = await this.prisma.recurringExpense.findUnique({ where: { id } });
        return found ? new RecurringExpense(found as any) : null;
    }

    async findByUser(userId: string): Promise<RecurringExpense[]> {
        const items = await this.prisma.recurringExpense.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return items.map((i) => new RecurringExpense(i as any));
    }

    async findActiveForGeneration(date: Date): Promise<RecurringExpense[]> {
        // Find rules that are active and whose next generation date is possibly <= target date.
        // This is simple: isActive=true AND (endDate IS NULL OR endDate >= startDate)
        // The use case will handle the specific date logic.
        const items = await this.prisma.recurringExpense.findMany({
            where: {
                isActive: true,
                OR: [
                    { endDate: null },
                    { endDate: { gte: new Date() } } // simplified check
                ]
            },
        });
        return items.map((i) => new RecurringExpense(i as any));
    }
}
