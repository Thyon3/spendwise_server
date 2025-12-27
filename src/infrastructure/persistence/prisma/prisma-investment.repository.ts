import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Investment } from '../../../../domain/entities/investment.entity';

@Injectable()
export class PrismaInvestmentRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, data: Partial<Investment>): Promise<Investment> {
        const created = await this.prisma.investment.create({
            data: {
                userId,
                name: data.name!,
                type: data.type!,
                symbol: data.symbol,
                quantity: data.quantity!,
                purchasePrice: data.purchasePrice!,
                currentPrice: data.currentPrice!,
                currency: data.currency!,
                purchaseDate: new Date(data.purchaseDate!),
                notes: data.notes,
            },
        });
        return new Investment(created);
    }

    async findAll(userId: string): Promise<Investment[]> {
        const items = await this.prisma.investment.findMany({
            where: { userId },
            orderBy: { purchaseDate: 'desc' },
        });
        return items.map(i => new Investment(i));
    }

    async findById(id: string, userId: string): Promise<Investment | null> {
        const found = await this.prisma.investment.findFirst({ where: { id, userId } });
        return found ? new Investment(found) : null;
    }

    async update(id: string, userId: string, data: Partial<Investment>): Promise<Investment> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Investment not found');
        const updated = await this.prisma.investment.update({
            where: { id },
            data: { quantity: data.quantity, currentPrice: data.currentPrice, notes: data.notes },
        });
        return new Investment(updated);
    }

    async delete(id: string, userId: string): Promise<void> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Investment not found');
        await this.prisma.investment.delete({ where: { id } });
    }

    async getPortfolioSummary(userId: string) {
        const investments = await this.findAll(userId);
        const totalValue = investments.reduce((s, i) => s + i.totalValue, 0);
        const totalCost = investments.reduce((s, i) => s + i.totalCost, 0);
        const gainLoss = totalValue - totalCost;
        const byType = investments.reduce((acc, i) => {
            acc[i.type] = (acc[i.type] || 0) + i.totalValue;
            return acc;
        }, {} as Record<string, number>);
        return { totalValue, totalCost, gainLoss, gainLossPercent: totalCost > 0 ? (gainLoss / totalCost) * 100 : 0, byType, count: investments.length };
    }
}
