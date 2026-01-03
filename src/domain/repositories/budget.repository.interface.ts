import { Budget, BudgetStatus } from '../entities/budget.entity';

export abstract class IBudgetRepository {
    abstract create(data: Partial<Budget>): Promise<Budget>;
    abstract update(id: string, data: Partial<Budget>): Promise<Budget>;
    abstract delete(id: string): Promise<void>;
    abstract findById(id: string): Promise<Budget | null>;
    abstract findByUser(userId: string): Promise<Budget[]>;
    abstract getBudgetStatus(budgetId: string, currentDate: Date): Promise<BudgetStatus>;
    abstract getAllBudgetStatuses(userId: string, currentDate: Date): Promise<BudgetStatus[]>;
}
