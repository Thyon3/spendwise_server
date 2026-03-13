import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { CustomLoggerService } from '../../infrastructure/logging/logger.service';

@Injectable()
export class BackupService {
  constructor(
    private prisma: PrismaService,
    private logger: CustomLoggerService,
  ) { }

  async createFullBackup(userId: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups', userId);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, `backup-${timestamp}.json`);

    try {
      const userData = await this.getAllUserData(userId);

      const backup = {
        userId,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        data: userData,
      };

      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

      this.logger.logUserAction(userId, 'backup_created', { backupPath });

      return backupPath;
    } catch (error) {
      this.logger.error('Failed to create backup', error.stack);
      throw new Error('Backup creation failed');
    }
  }

  async restoreFromBackup(userId: string, backupPath: string): Promise<void> {
    try {
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

      if (backupData.userId !== userId) {
        throw new Error('Backup does not belong to this user');
      }

      await this.restoreUserData(backupData.data);

      this.logger.logUserAction(userId, 'backup_restored', { backupPath });
    } catch (error) {
      this.logger.error('Failed to restore backup', error.stack);
      throw new Error('Backup restoration failed');
    }
  }

  async createIncrementalBackup(userId: string, lastBackupTime: Date): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups', userId);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, `incremental-backup-${timestamp}.json`);

    try {
      const changesSinceLastBackup = await this.getChangesSince(userId, lastBackupTime);

      const backup = {
        userId,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        type: 'incremental',
        lastBackupTime: lastBackupTime.toISOString(),
        data: changesSinceLastBackup,
      };

      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

      this.logger.logUserAction(userId, 'incremental_backup_created', { backupPath });

      return backupPath;
    } catch (error) {
      this.logger.error('Failed to create incremental backup', error.stack);
      throw new Error('Incremental backup creation failed');
    }
  }

  async scheduleAutomaticBackups(userId: string, frequency: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    // This would integrate with a job scheduler like Bull Queue
    const schedule = {
      daily: '0 2 * * *', // 2 AM daily
      weekly: '0 2 * * 0', // 2 AM on Sunday
      monthly: '0 2 1 * *', // 2 AM on 1st of month
    };

    this.logger.logUserAction(userId, 'automatic_backup_scheduled', { frequency, schedule: schedule[frequency] });
  }

  async cleanupOldBackups(userId: string, retentionDays: number = 30): Promise<void> {
    const backupDir = path.join(process.cwd(), 'backups', userId);

    if (!fs.existsSync(backupDir)) {
      return;
    }

    const files = fs.readdirSync(backupDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    this.logger.logUserAction(userId, 'backup_cleanup', { deletedCount, retentionDays });
  }

  async exportUserData(userId: string, format: 'json' | 'csv' | 'xlsx'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportDir = path.join(process.cwd(), 'exports', userId);

    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const userData = await this.getAllUserData(userId);

    switch (format) {
      case 'json':
        return await this.exportAsJson(userData, exportDir, timestamp);
      case 'csv':
        return await this.exportAsCsv(userData, exportDir, timestamp);
      case 'xlsx':
        return await this.exportAsExcel(userData, exportDir, timestamp);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async getAllUserData(userId: string) {
    const [
      user,
      expenses,
      income,
      categories,
      budgets,
      tags,
      savingsGoals,
      paymentMethods,
      subscriptions,
      debts,
      investments,
    ] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.expense.findMany({
        where: { userId },
        include: { category: true, tags: true, paymentMethod: true }
      }),
      this.prisma.income.findMany({
        where: { userId },
        include: { category: true }
      }),
      this.prisma.category.findMany({ where: { userId } }),
      this.prisma.budget.findMany({
        where: { userId },
        include: { category: true }
      }),
      this.prisma.tag.findMany({ where: { userId } }),
      this.prisma.savingsGoal.findMany({ where: { userId } }),
      this.prisma.paymentMethod.findMany({ where: { userId } }),
      this.prisma.subscription.findMany({ where: { userId } }),
      this.prisma.debt.findMany({
        where: { userId },
        include: { payments: true }
      }),
      this.prisma.investment.findMany({ where: { userId } }),
    ]);

    return {
      user,
      expenses,
      income,
      categories,
      budgets,
      tags,
      savingsGoals,
      paymentMethods,
      subscriptions,
      debts,
      investments,
    };
  }

  private async getChangesSince(userId: string, lastBackupTime: Date) {
    const changes = {
      expenses: await this.prisma.expense.findMany({
        where: {
          userId,
          updatedAt: { gte: lastBackupTime }
        }
      }),
      income: await this.prisma.income.findMany({
        where: {
          userId,
          updatedAt: { gte: lastBackupTime }
        }
      }),
      categories: await this.prisma.category.findMany({
        where: {
          userId,
          updatedAt: { gte: lastBackupTime }
        }
      }),
      // Add other entities as needed
    };

    return changes;
  }

  private async restoreUserData(userData: any): Promise<void> {
    // This would need to handle conflicts and data integrity
    // For now, it's a simplified version

    const transactions: Promise<any>[] = [];

    // Restore categories first (they're referenced by other entities)
    if (userData.categories?.length > 0) {
      for (const category of userData.categories) {
        transactions.push(
          this.prisma.category.upsert({
            where: { userId_name: { userId: category.userId, name: category.name } },
            update: category,
            create: category,
          })
        );
      }
    }

    // Restore other entities
    // Add similar logic for other data types...

    await this.prisma.$transaction(transactions);
  }

  private async exportAsJson(userData: any, exportDir: string, timestamp: string): Promise<string> {
    const filePath = path.join(exportDir, `export-${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
    return filePath;
  }

  private async exportAsCsv(userData: any, exportDir: string, timestamp: string): Promise<string> {
    // Simplified CSV export - in production, you'd use a proper CSV library
    const csvContent = this.convertToCsv(userData.expenses || []);
    const filePath = path.join(exportDir, `expenses-${timestamp}.csv`);
    fs.writeFileSync(filePath, csvContent);
    return filePath;
  }

  private async exportAsExcel(userData: any, exportDir: string, timestamp: string): Promise<string> {
    // In production, you'd use a library like xlsx
    // For now, return JSON as placeholder
    return this.exportAsJson(userData, exportDir, timestamp);
  }

  private convertToCsv(expenses: any[]): string {
    if (expenses.length === 0) return '';

    const headers = ['Date', 'Description', 'Amount', 'Category', 'Currency'];
    const rows = expenses.map(expense => [
      expense.date.toISOString().split('T')[0],
      expense.description || '',
      expense.amount.toString(),
      expense.category?.name || '',
      expense.currency,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  async getBackupHistory(userId: string): Promise<any[]> {
    const backupDir = path.join(process.cwd(), 'backups', userId);

    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir);
    const backups = files.map(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);

      return {
        filename: file,
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return backups;
  }

  async validateBackup(backupPath: string): Promise<boolean> {
    try {
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

      // Basic validation
      if (!backupData.userId || !backupData.timestamp || !backupData.data) {
        return false;
      }

      // Validate structure
      const requiredFields = ['user', 'expenses', 'income', 'categories'];
      for (const field of requiredFields) {
        if (!backupData.data[field]) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}
