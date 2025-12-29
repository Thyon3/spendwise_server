import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PaymentMethodRepository } from '../../../../domain/repositories/payment-method.repository';
import { PaymentMethod } from '../../../../domain/entities/payment-method.entity';

@Injectable()
export class PrismaPaymentMethodRepository implements PaymentMethodRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> {
        if (data.isDefault) {
            await this.prisma.paymentMethod.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }
        const created = await this.prisma.paymentMethod.create({
            data: {
                userId,
                name: data.name!,
                type: data.type!,
                lastFourDigits: data.lastFourDigits,
                isDefault: data.isDefault ?? false,
            },
        });
        return new PaymentMethod(created);
    }

    async findById(id: string, userId: string): Promise<PaymentMethod | null> {
        const found = await this.prisma.paymentMethod.findFirst({ where: { id, userId } });
        return found ? new PaymentMethod(found) : null;
    }

    async findAll(userId: string): Promise<PaymentMethod[]> {
        const items = await this.prisma.paymentMethod.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
        return items.map(i => new PaymentMethod(i));
    }

    async update(id: string, userId: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Payment method not found');

        const updated = await this.prisma.paymentMethod.update({
            where: { id },
            data: {
                name: data.name,
                lastFourDigits: data.lastFourDigits,
                isDefault: data.isDefault,
                isActive: data.isActive,
            },
        });
        return new PaymentMethod(updated);
    }

    async delete(id: string, userId: string): Promise<void> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Payment method not found');
        await this.prisma.paymentMethod.delete({ where: { id } });
    }

    async setDefault(id: string, userId: string): Promise<PaymentMethod> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Payment method not found');

        await this.prisma.paymentMethod.updateMany({
            where: { userId },
            data: { isDefault: false },
        });
        const updated = await this.prisma.paymentMethod.update({
            where: { id },
            data: { isDefault: true },
        });
        return new PaymentMethod(updated);
    }
}
