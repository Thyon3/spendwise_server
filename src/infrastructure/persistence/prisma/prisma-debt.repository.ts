import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Debt, DebtPayment } from '../../../../domain/entities/debt.entity';

@Injectable()
export class PrismaDebtRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, data: Partial<Debt>): Promise<Debt> {
        const created = await this.prisma.debt.create({
            data: {
                userId,
                name: data.name!,
                type: data.type!,
                totalAmount: data.totalAmount!,
                remainingAmount: data.remainingAmount!,
                interestRate: data.interestRate,
                currency: data.currency!,
                startDate: new Date(data.startDate!),
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                minimumPayment: data.minimumPayment,
            },
            include: { payments: true },
        });
        return new Debt(created);
    }

    async findAll(userId: string): Promise<Debt[]> {
        const items = await this.prisma.debt.findMany({
            where: { userId },
            include: { payments: { orderBy: { paymentDate: 'desc' }, take: 5 } },
            orderBy: { createdAt: 'desc' },
        });
        return items.map(i => new Debt(i));
    }

    async findById(id: string, userId: string): Promise<Debt | null> {
        const found = await this.prisma.debt.findFirst({
            where: { id, userId },
            include: { payments: { orderBy: { paymentDate: 'desc' } } },
        });
        return found ? new Debt(found) : null;
    }

    async update(id: string, userId: string, data: Partial<Debt>): Promise<Debt> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Debt not found');

        const updated = await this.prisma.debt.update({
            where: { id },
            data: {
                name: data.name,
                remainingAmount: data.remainingAmount,
                interestRate: data.interestRate,
                dueDate: data.dueDate,
                minimumPayment: data.minimumPayment,
                isPaidOff: data.isPaidOff,
            },
            include: { payments: true },
        });
        return new Debt(updated);
    }

    async delete(id: string, userId: string): Promise<void> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Debt not found');
        await this.prisma.debt.delete({ where: { id } });
    }

    async addPayment(debtId: string, userId: string, data: Partial<DebtPayment>): Promise<DebtPayment> {
        const debt = await this.findById(debtId, userId);
        if (!debt) throw new NotFoundException('Debt not found');

        const payment = await this.prisma.debtPayment.create({
            data: {
                debtId,
                amount: data.amount!,
                principalAmount: data.principalAmount!,
                interestAmount: data.interestAmount!,
                paymentDate: new Date(data.paymentDate!),
                notes: data.notes,
            },
        });

        const newRemaining = Math.max(0, debt.remainingAmount - data.principalAmount!);
        await this.prisma.debt.update({
            where: { id: debtId },
            data: {
                remainingAmount: newRemaining,
                isPaidOff: newRemaining === 0,
            },
        });

        return new DebtPayment(payment);
    }

    async getSummary(userId: string) {
        const debts = await this.findAll(userId);
        const totalDebt = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
        const totalOriginal = debts.reduce((sum, d) => sum + d.totalAmount, 0);
        const paidOff = debts.filter(d => d.isPaidOff).length;
        return { totalDebts: debts.length, totalDebt, totalOriginal, paidOff, active: debts.length - paidOff };
    }
}
