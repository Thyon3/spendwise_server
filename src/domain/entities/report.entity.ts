export interface CategoryBreakdown {
    categoryId: string;
    categoryName: string;
    totalAmount: number;
    percentageOfTotal: number;
}

export interface TagBreakdown {
    tagId: string;
    tagName: string;
    totalAmount: number;
    percentageOfTotal: number;
}

export class TimeRangeReport {
    from: Date;
    to: Date;
    totalAmount: number;
    categoryBreakdown: CategoryBreakdown[];
    tagBreakdown: TagBreakdown[];

    constructor(partial: Partial<TimeRangeReport>) {
        Object.assign(this, partial);
    }
}

export class TrendPoint {
    periodStart: Date;
    periodEnd: Date;
    totalAmount: number;

    constructor(partial: Partial<TrendPoint>) {
        Object.assign(this, partial);
    }
}

export class TrendReport {
    granularity: 'day' | 'week' | 'month';
    trends: TrendPoint[];

    constructor(partial: Partial<TrendReport>) {
        Object.assign(this, partial);
    }
}

export class FinancialSummary {
    income: number;
    expense: number;
    balance: number;

    constructor(partial: Partial<FinancialSummary>) {
        Object.assign(this, partial);
    }
}
