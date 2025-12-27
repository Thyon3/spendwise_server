export class Investment {
    id: string;
    userId: string;
    name: string;
    type: string; // STOCKS, BONDS, MUTUAL_FUNDS, CRYPTO, REAL_ESTATE, OTHER
    symbol?: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    currency: string;
    purchaseDate: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: Partial<Investment>) {
        Object.assign(this, data);
    }

    get totalValue(): number {
        return this.quantity * this.currentPrice;
    }

    get totalCost(): number {
        return this.quantity * this.purchasePrice;
    }

    get gainLoss(): number {
        return this.totalValue - this.totalCost;
    }

    get gainLossPercent(): number {
        return this.totalCost > 0 ? (this.gainLoss / this.totalCost) * 100 : 0;
    }
}
