export class SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline?: Date;
  description?: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  get progress(): number {
    return this.targetAmount > 0 ? (this.currentAmount / this.targetAmount) * 100 : 0;
  }

  get remainingAmount(): number {
    return Math.max(0, this.targetAmount - this.currentAmount);
  }
}
