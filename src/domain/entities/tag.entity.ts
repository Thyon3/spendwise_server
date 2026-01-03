export class Tag {
    id: string;
    name: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Tag>) {
        Object.assign(this, partial);
    }
}
