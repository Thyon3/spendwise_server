export class Settings {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly preferredCurrency: string,
        public readonly theme: string,
        public readonly notificationsEnabled: boolean,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
    ) { }
}
