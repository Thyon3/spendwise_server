export class Income {
    constructor(
        public readonly id: string,
        public readonly amount: number,
        public readonly currency: string,
        public readonly description: string | null,
        public readonly date: Date,
        public readonly userId: string,
        public readonly categoryId: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly categoryName?: string, // Optional for listing with details
        public readonly categoryColor?: string, // Optional for listing with details
    ) { }
}
