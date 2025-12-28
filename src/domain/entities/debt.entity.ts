export class Debt {
    id: string;
    userId: string;
    name: string;
    type: string;
    totalAmount: number;
    remainingAmount: number;
    interestRate?: number;
    currency: string;
    startDate: Date;
    dueDate?: Date;
    minimumPayment?: number;
    isPaidOff: boolean;
    createdAt: Date;
    updatedAt: Date;
    payments?: DebtPayment[];

    constructor(data: Partial<Debt>) {
        Object.assign(this, data);
    }

    get paidAmount(): number {
        return this.totalAmount - this.remainingAmount;
    }

    get progressPercent(): number {
        return this.totalAmount > 0 ? (this.paidAmount / this.totalAmount) * 100 : 0;
    }
}

export class DebtPayment {
    id: string;
    debtId: string;
    amount: number;
    principalAmount: number;
    interestAmount: number;
    paymentDate: Date;
    notes?: string;
    createdAt: Date;

    constructor(data: Partial<DebtPayment>) {
        Object.assign(this, data);
    }
}
