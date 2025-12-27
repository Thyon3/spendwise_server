export class Tag {
    id: string;
    name: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(data: Partial<Tag>) {
        Object.assign(this, data);
    }
}
