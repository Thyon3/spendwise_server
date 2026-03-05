import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  async createBackup(userId: string): Promise<any> {
    const [
      expenses,
      income,
      categories,
      budgets,
      savingsGoals,
      paymentMethods,
      settings,
    ] = await Promise.all([
      this.prisma.expense.findMany({ where: { userId } }),
      this.prisma.income.findMany({ where: { userId } }),
      this.prisma.category.findMany({ where: { userId } }),
      this.prisma.budget.findMany({ where: { userId } }),
      this.prisma.savingsGoal.findMany({ where: { userId } }),
      this.prisma.paymentMethod.findMany({ where: { userId } }),
      this.prisma.settings.findUnique({ where: { userId } }),
    ]);

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      userId,
      data: {
        expenses,
        income,
        categories,
        budgets,
        savingsGoals,
        paymentMethods,
        settings,
      },
    };
  }

  async restoreBackup(userId: string, backupData: any): Promise<void> {
    console.log(`Restoring backup for user ${userId}...`);
    // TODO: Implement restore logic with transaction
  }
}
