export class WishlistItem {
    id: string;
    userId: string;
    name: string;
    description?: string;
    estimatedCost: number;
    currency: string;
    priority: number; // 1-5
    targetDate?: Date;
    isPurchased: boolean;
    purchasedAt?: Date;
    url?: string;
    imageUrl?: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: Partial<WishlistItem>) {
        Object.assign(this, data);
    }
}
