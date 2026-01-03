export class Expense {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    description?: string;
    date: Date;
    categoryId: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Expense>) {
        Object.assign(this, partial);
    }
}
