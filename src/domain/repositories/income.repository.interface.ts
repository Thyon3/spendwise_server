import { Income } from '../entities/income.entity';

export interface IncomeFilters {
    from?: Date;
    to?: Date;
    categoryId?: string;
    search?: string;
    sortBy?: 'date' | 'amount';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

export interface IncomeSummary {
    totalAmount: number;
    byCategory: { categoryId: string; total: number }[];
}

export abstract class IIncomeRepository {
    abstract create(data: Partial<Income>): Promise<Income>;
    abstract update(id: string, data: Partial<Income>): Promise<Income>;
    abstract delete(id: string): Promise<void>;
    abstract findById(id: string): Promise<Income | null>;
    abstract findByUser(userId: string, filters: IncomeFilters): Promise<Income[]>;
    abstract getSummary(userId: string, from: Date, to: Date): Promise<IncomeSummary>;
}
