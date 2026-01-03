export class CreateExpenseDto {
    amount: number;
    currency: string;
    description?: string;
    date: string; // ISO date string
    categoryId: string;
}

export class UpdateExpenseDto {
    amount?: number;
    currency?: string;
    description?: string;
    date?: string;
    categoryId?: string;
}

export class ExpenseFiltersDto {
    from?: string;
    to?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
}
