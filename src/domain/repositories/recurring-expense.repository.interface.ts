import { RecurringExpense } from '../entities/recurring-expense.entity';

export abstract class IRecurringExpenseRepository {
    abstract create(data: Partial<RecurringExpense>): Promise<RecurringExpense>;
    abstract update(id: string, data: Partial<RecurringExpense>): Promise<RecurringExpense>;
    abstract delete(id: string): Promise<void>;
    abstract findById(id: string): Promise<RecurringExpense | null>;
    abstract findByUser(userId: string): Promise<RecurringExpense[]>;
    abstract findActiveForGeneration(date: Date): Promise<RecurringExpense[]>;
}
