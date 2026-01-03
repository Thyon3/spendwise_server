export enum RecurrenceType {
    NONE = 'NONE',
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY',
}

export class RecurringExpense {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    description?: string;
    categoryId: string;
    recurrenceType: RecurrenceType;
    interval: number; // e.g., every 1 week, every 2 months
    startDate: Date;
    endDate?: Date;
    lastGeneratedDate?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<RecurringExpense>) {
        Object.assign(this, partial);
    }
}
