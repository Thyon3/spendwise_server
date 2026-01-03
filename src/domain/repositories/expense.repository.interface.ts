import { Expense } from '../entities/expense.entity';

export interface ExpenseFilters {
    from?: Date;
    to?: Date;
    categoryId?: string;
    tagId?: string;
    search?: string;
    sortBy?: 'date' | 'amount';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

export interface ExpenseSummary {
    totalAmount: number;
    byCategory: { categoryId: string; total: number }[];
}

export abstract class IExpenseRepository {
    abstract create(expense: Partial<Expense> & { tagIds?: string[] }): Promise<Expense>;
    abstract update(id: string, expense: Partial<Expense> & { tagIds?: string[] }): Promise<Expense>;
    abstract delete(id: string): Promise<void>;
    abstract findById(id: string): Promise<Expense | null>;
    abstract findByUser(userId: string, filters: ExpenseFilters): Promise<Expense[]>;
    abstract getSummary(userId: string, from: Date, to: Date): Promise<ExpenseSummary>;
}
