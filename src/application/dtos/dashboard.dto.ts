export class DashboardSummaryDto {
  totalExpenses: number;
  totalIncome: number;
  netBalance: number;
  monthlyAverage: number;
  topCategories: Array<{ name: string; amount: number; percentage: number }>;
  recentTransactions: any[];
  budgetStatus: Array<{ name: string; spent: number; limit: number; percentage: number }>;
  savingsGoalProgress: Array<{ name: string; current: number; target: number; percentage: number }>;
}
