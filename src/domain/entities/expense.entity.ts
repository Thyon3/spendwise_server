import { Tag } from './tag.entity';
import { Category } from './category.entity';

export class Expense {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    description?: string;
    date: Date;
    categoryId: string;
    category?: Category;
    recurringExpenseId?: string;
    tags?: Tag[];
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Expense>) {
        Object.assign(this, partial);
        if (partial.tags) {
            this.tags = partial.tags.map(t => new Tag(t));
        }
        if (partial.category) {
            this.category = new Category(partial.category);
        }
    }
}
