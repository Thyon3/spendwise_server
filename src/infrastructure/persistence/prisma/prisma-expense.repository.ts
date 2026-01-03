import { Injectable } from '@nestjs/common';
import { IExpenseRepository, ExpenseFilters, ExpenseSummary } from '../../../../domain/repositories/expense.repository.interface';
import { Expense } from '../../../../domain/entities/expense.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaExpenseRepository implements IExpenseRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Expense> & { tagIds?: string[] }): Promise<Expense> {
        const created = await this.prisma.expense.create({
            data: {
                amount: data.amount!,
                currency: data.currency!,
                description: data.description,
                date: data.date!,
                userId: data.userId!,
                categoryId: data.categoryId!,
                recurringExpenseId: data.recurringExpenseId,
                tags: data.tagIds ? {
                    connect: data.tagIds.map(id => ({ id }))
                } : undefined,
            },
            include: { category: true, tags: true },
        });
        return new Expense(created);
    }

    async update(id: string, data: Partial<Expense> & { tagIds?: string[] }): Promise<Expense> {
        const updated = await this.prisma.expense.update({
            where: { id },
            data: {
                amount: data.amount,
                currency: data.currency,
                description: data.description,
                date: data.date,
                categoryId: data.categoryId,
                tags: data.tagIds ? {
                    set: data.tagIds.map(id => ({ id }))
                } : undefined,
            },
            include: { category: true, tags: true },
        });
        return new Expense(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.expense.delete({ where: { id } });
    }

    async findById(id: string): Promise<Expense | null> {
        const found = await this.prisma.expense.findUnique({
            where: { id },
            include: { category: true, tags: true },
        });
        return found ? new Expense(found) : null;
    }

    async findByUser(userId: string, filters: ExpenseFilters): Promise<Expense[]> {
        const { from, to, categoryId, tagId, search, sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = filters;

        const where: any = {
            userId,
            AND: [],
        };

        if (from) where.AND.push({ date: { gte: from } });
        if (to) where.AND.push({ date: { lte: to } });
        if (categoryId) where.AND.push({ categoryId });
        if (tagId) where.AND.push({ tags: { some: { id: tagId } } });
        if (search) {
            where.AND.push({
                OR: [
                    { description: { contains: search, mode: 'insensitive' } },
                    { tags: { some: { name: { contains: search, mode: 'insensitive' } } } },
                ],
            });
        }

        const items = await this.prisma.expense.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
            include: { category: true, tags: true },
        });

        return items.map((i) => new Expense(i));
    }

    async getSummary(userId: string, from: Date, to: Date): Promise<ExpenseSummary> {
        const expenses = await this.prisma.expense.findMany({
            where: {
                userId,
                date: { gte: from, lte: to },
            },
        });

        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
        const byCategoryMap = new Map<string, number>();

        expenses.forEach((e) => {
            const current = byCategoryMap.get(e.categoryId) || 0;
            byCategoryMap.set(e.categoryId, current + e.amount);
        });

        return {
            totalAmount,
            byCategory: Array.from(byCategoryMap.entries()).map(([categoryId, total]) => ({
                categoryId,
                total,
            })),
        };
    }
}
