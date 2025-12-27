import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { WishlistItem } from '../../../../domain/entities/wishlist.entity';

@Injectable()
export class PrismaWishlistRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, data: Partial<WishlistItem>): Promise<WishlistItem> {
        const created = await this.prisma.wishlist.create({
            data: {
                userId,
                name: data.name!,
                description: data.description,
                estimatedCost: data.estimatedCost!,
                currency: data.currency!,
                priority: data.priority ?? 3,
                targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
                url: data.url,
            },
        });
        return new WishlistItem(created);
    }

    async findAll(userId: string, onlyPending = false): Promise<WishlistItem[]> {
        const items = await this.prisma.wishlist.findMany({
            where: { userId, ...(onlyPending ? { isPurchased: false } : {}) },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });
        return items.map(i => new WishlistItem(i));
    }

    async findById(id: string, userId: string): Promise<WishlistItem | null> {
        const found = await this.prisma.wishlist.findFirst({ where: { id, userId } });
        return found ? new WishlistItem(found) : null;
    }

    async update(id: string, userId: string, data: Partial<WishlistItem>): Promise<WishlistItem> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Wishlist item not found');
        const updated = await this.prisma.wishlist.update({
            where: { id },
            data: {
                name: data.name,
                estimatedCost: data.estimatedCost,
                priority: data.priority,
                targetDate: data.targetDate,
                isPurchased: data.isPurchased,
                purchasedAt: data.isPurchased ? new Date() : undefined,
                url: data.url,
            },
        });
        return new WishlistItem(updated);
    }

    async delete(id: string, userId: string): Promise<void> {
        const existing = await this.findById(id, userId);
        if (!existing) throw new NotFoundException('Wishlist item not found');
        await this.prisma.wishlist.delete({ where: { id } });
    }
}
