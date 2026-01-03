import { Injectable } from '@nestjs/common';
import { IExpenseRepository, ExpenseFilters, ExpenseSummary } from '../../../../domain/repositories/expense.repository.interface';
import { Expense } from '../../../../domain/entities/expense.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaExpenseRepository implements IExpenseRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Expense>): Promise<Expense> {
        const expense = await this.prisma.expense.create({
            data: {
                amount: data.amount!,
                currency: data.currency!,
                description: data.description,
                date: data.date!,
                userId: data.userId!,
                categoryId: data.categoryId!,
            },
        });
        return new Expense(expense);
    }

    async update(id: string, data: Partial<Expense>): Promise<Expense> {
        const expense = await this.prisma.expense.update({
            where: { id },
            data: {
                amount: data.amount,
                currency: data.currency,
                description: data.description,
                date: data.date,
                categoryId: data.categoryId,
            },
        });
        return new Expense(expense);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.expense.delete({ where: { id } });
    }

    async findById(id: string): Promise<Expense | null> {
        const expense = await this.prisma.expense.findUnique({ where: { id } });
        return expense ? new Expense(expense) : null;
    }

    async findByUser(userId: string, filters: ExpenseFilters): Promise<Expense[]> {
        const { from, to, categoryId, page = 1, limit = 20 } = filters;

        const expenses = await this.prisma.expense.findMany({
            where: {
                userId,
                date: {
                    gte: from,
                    lte: to,
                },
                categoryId,
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { date: 'desc' },
            include: {
                category: true,
            },
        });

        return expenses.map((e) => new Expense(e));
    }

    async getSummary(userId: string, from: Date, to: Date): Promise<ExpenseSummary> {
        const aggregates = await this.prisma.expense.groupBy({
            by: ['categoryId'],
            where: {
                userId,
                date: {
                    gte: from,
                    lte: to,
                },
            },
            _sum: {
                amount: true,
            },
        });

        const totalAmount = aggregates.reduce((sum, item) => sum + (item._sum.amount || 0), 0);
        const byCategory = aggregates.map((item) => ({
            categoryId: item.categoryId,
            total: item._sum.amount || 0,
        }));

        return {
            totalAmount,
            byCategory,
        };
    }
}
