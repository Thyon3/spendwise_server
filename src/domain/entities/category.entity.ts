export class Category {
    id: string;
    name: string;
    color: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Category>) {
        Object.assign(this, partial);
    }
}
