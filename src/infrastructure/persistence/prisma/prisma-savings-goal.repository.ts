import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SavingsGoalRepository } from '../../../../domain/repositories/savings-goal.repository';
import { SavingsGoal } from '../../../../domain/entities/savings-goal.entity';

@Injectable()
export class PrismaSavingsGoalRepository implements SavingsGoalRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
        const created = await this.prisma.savingsGoal.create({
            data: {
                userId,
                name: data.name!,
                targetAmount: data.targetAmount!,
                currentAmount: data.currentAmount ?? 0,
                currency: data.currency!,
                deadline: data.deadline,
                description: data.description,
            },
        });
        return Object.assign(new SavingsGoal(), created);
    }

    async findById(id: string, userId: string): Promise<SavingsGoal | null> {
        const found = await this.prisma.savingsGoal.findFirst({ where: { id, userId } });
        return found ? Object.assign(new SavingsGoal(), found) : null;
    }

    async findAll(userId: string): Promise<SavingsGoal[]> {
        const items = await this.prisma.savingsGoal.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return items.map(i => Object.assign(new SavingsGoal(), i));
    }

    async update(id: string, userId: string, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Savings goal not found');

        const updated = await this.prisma.savingsGoal.update({
            where: { id },
            data: {
                name: data.name,
                targetAmount: data.targetAmount,
                currentAmount: data.currentAmount,
                deadline: data.deadline,
                description: data.description,
                isCompleted: data.isCompleted,
            },
        });
        return Object.assign(new SavingsGoal(), updated);
    }

    async delete(id: string, userId: string): Promise<void> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Savings goal not found');
        await this.prisma.savingsGoal.delete({ where: { id } });
    }

    async updateProgress(id: string, userId: string, amount: number): Promise<SavingsGoal> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Savings goal not found');

        const newAmount = existing.currentAmount + amount;
        const isCompleted = newAmount >= existing.targetAmount;

        const updated = await this.prisma.savingsGoal.update({
            where: { id },
            data: {
                currentAmount: newAmount,
                isCompleted,
            },
        });
        return Object.assign(new SavingsGoal(), updated);
    }
}
