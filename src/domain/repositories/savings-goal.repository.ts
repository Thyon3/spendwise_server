import { SavingsGoal } from '../entities/savings-goal.entity';

export interface SavingsGoalRepository {
  create(userId: string, data: Partial<SavingsGoal>): Promise<SavingsGoal>;
  findById(id: string, userId: string): Promise<SavingsGoal | null>;
  findAll(userId: string): Promise<SavingsGoal[]>;
  update(id: string, userId: string, data: Partial<SavingsGoal>): Promise<SavingsGoal>;
  delete(id: string, userId: string): Promise<void>;
  updateProgress(id: string, userId: string, amount: number): Promise<SavingsGoal>;
}
