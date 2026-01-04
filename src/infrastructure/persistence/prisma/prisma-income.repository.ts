import { Injectable } from '@nestjs/common';
import { IIncomeRepository, IncomeFilters, IncomeSummary } from '../../../../domain/repositories/income.repository.interface';
import { Income } from '../../../../domain/entities/income.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaIncomeRepository implements IIncomeRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Income>): Promise<Income> {
        const created = await this.prisma.income.create({
            data: {
                amount: data.amount!,
                currency: data.currency!,
                description: data.description,
                date: data.date!,
                userId: data.userId!,
                categoryId: data.categoryId!,
            },
            include: { category: true },
        });
        return this.toDomain(created);
    }

    async update(id: string, data: Partial<Income>): Promise<Income> {
        const updated = await this.prisma.income.update({
            where: { id },
            data: {
                amount: data.amount,
                currency: data.currency,
                description: data.description,
                date: data.date,
                categoryId: data.categoryId,
            },
            include: { category: true },
        });
        return this.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.income.delete({ where: { id } });
    }

    async findById(id: string): Promise<Income | null> {
        const found = await this.prisma.income.findUnique({
            where: { id },
            include: { category: true },
        });
        return found ? this.toDomain(found) : null;
    }

    async findByUser(userId: string, filters: IncomeFilters): Promise<Income[]> {
        const { from, to, categoryId, search, sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = filters;

        const where: any = {
            userId,
            AND: [],
        };

        if (from) where.AND.push({ date: { gte: from } });
        if (to) where.AND.push({ date: { lte: to } });
        if (categoryId) where.AND.push({ categoryId });
        if (search) {
            where.AND.push({
                description: { contains: search, mode: 'insensitive' },
            });
        }

        const items = await this.prisma.income.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
            include: { category: true },
        });

        return items.map((i) => this.toDomain(i));
    }

    async getSummary(userId: string, from: Date, to: Date): Promise<IncomeSummary> {
        const incomes = await this.prisma.income.findMany({
            where: {
                userId,
                date: { gte: from, lte: to },
            },
        });

        const totalAmount = incomes.reduce((sum, i) => sum + i.amount, 0);
        const byCategoryMap = new Map<string, number>();

        incomes.forEach((i) => {
            const current = byCategoryMap.get(i.categoryId) || 0;
            byCategoryMap.set(i.categoryId, current + i.amount);
        });

        return {
            totalAmount,
            byCategory: Array.from(byCategoryMap.entries()).map(([categoryId, total]) => ({
                categoryId,
                total,
            })),
        };
    }

    private toDomain(p: any): Income {
        return new Income(
            p.id,
            p.amount,
            p.currency,
            p.description,
            p.date,
            p.userId,
            p.categoryId,
            p.createdAt,
            p.updatedAt,
            p.category?.name,
            p.category?.color,
        );
    }
}
