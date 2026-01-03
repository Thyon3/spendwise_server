export enum PeriodType {
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    CUSTOM_RANGE = 'CUSTOM_RANGE',
}

export class Budget {
    id: string;
    userId: string;
    name: string;
    amountLimit: number;
    currency: string;
    periodType: PeriodType;
    periodStart?: Date;
    periodEnd?: Date;
    categoryId?: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Budget>) {
        Object.assign(this, partial);
    }
}

export class BudgetStatus {
    budgetId: string;
    budgetName: string;
    periodStart: Date;
    periodEnd: Date;
    amountLimit: number;
    amountSpent: number;
    percentageUsed: number;
    isOverLimit: boolean;
    isNearLimit: boolean;

    constructor(partial: Partial<BudgetStatus>) {
        Object.assign(this, partial);
    }
}
