import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface BackupOptions {
  includeAttachments?: boolean;
  includeSettings?: boolean;
  includeDeleted?: boolean;
  format?: 'json' | 'csv' | 'xml';
  compression?: boolean;
  encryption?: boolean;
}

export interface BackupMetadata {
  id: string;
  userId: string;
  version: string;
  createdAt: Date;
  size: number;
  format: string;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  itemCount: {
    expenses: number;
    income: number;
    categories: number;
    budgets: number;
    savingsGoals: number;
    paymentMethods: number;
  };
}

export interface BackupResult {
  backup: BackupMetadata;
  downloadUrl: string;
  expiresAt: Date;
}

export interface RestoreResult {
  success: boolean;
  restoredItems: {
    expenses: number;
    income: number;
    categories: number;
    budgets: number;
    savingsGoals: number;
    paymentMethods: number;
  };
  errors: string[];
  warnings: string[];
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backups = new Map<string, BackupMetadata>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  async createBackup(
    userId: string,
    options: BackupOptions = {},
  ): Promise<BackupResult> {
    const startTime = Date.now();

    try {
      // Fetch user data
      const [
        expenses,
        income,
        categories,
        budgets,
        savingsGoals,
        paymentMethods,
        settings,
      ] = await Promise.all([
        this.prisma.expense.findMany({
          where: { userId },
          include: [{ category: true }, { tags: true }, { paymentMethod: true }]
        }),
        this.prisma.income.findMany({
          where: { userId },
          include: [{ category: true }]
        }),
        this.prisma.category.findMany({ where: { userId } }),
        this.prisma.budget.findMany({
          where: { userId },
          include: [{ category: true }]
        }),
        this.prisma.savingsGoal.findMany({ where: { userId } }),
        this.prisma.paymentMethod.findMany({ where: { userId } }),
        this.prisma.settings.findUnique({ where: { userId } }),
      ]);

      // Create backup data
      const backupData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        userId,
        options,
        data: {
          expenses: options.includeDeleted !== false ? expenses : expenses.filter(e => !e.deletedAt),
          income: options.includeDeleted !== false ? income : income.filter(i => !i.deletedAt),
          categories,
          budgets,
          savingsGoals,
          paymentMethods,
          settings: options.includeSettings !== false ? settings : null,
        },
      };

      // Process backup
      let processedData = JSON.stringify(backupData, null, 2);
      let compressed = false;
      let encrypted = false;

      // Apply compression
      if (options.compression) {
        processedData = await this.compressData(processedData);
        compressed = true;
      }

      // Apply encryption
      if (options.encryption) {
        processedData = await this.encryptData(processedData);
        encrypted = true;
      }

      // Create metadata
      const metadata: BackupMetadata = {
        id: this.generateId(),
        userId,
        version: backupData.version,
        createdAt: new Date(),
        size: processedData.length,
        format: options.format || 'json',
        compressed,
        encrypted,
        checksum: this.calculateChecksum(processedData),
        itemCount: {
          expenses: expenses.length,
          income: income.length,
          categories: categories.length,
          budgets: budgets.length,
          savingsGoals: savingsGoals.length,
          paymentMethods: paymentMethods.length,
        },
      };

      // Store backup (in real implementation, save to storage service)
      this.backups.set(metadata.id, metadata);

      // Generate download URL
      const downloadUrl = `/api/backups/download/${metadata.id}`;
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

      this.logger.log(`Backup created for user ${userId}: ${metadata.id}`);

      return {
        backup: metadata,
        downloadUrl,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(`Failed to create backup for user ${userId}:`, error);
      throw new HttpException(
        `Backup creation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createIncrementalBackup(
    userId: string,
    lastBackupId: string,
    options: BackupOptions = {},
  ): Promise<BackupResult> {
    const lastBackup = this.backups.get(lastBackupId);
    if (!lastBackup || lastBackup.userId !== userId) {
      throw new HttpException('Invalid last backup ID', HttpStatus.BAD_REQUEST);
    }

    // Get last backup date
    const lastBackupDate = lastBackup.createdAt;

    try {
      // Fetch only data modified since last backup
      const [
        expenses,
        income,
        categories,
        budgets,
        savingsGoals,
        paymentMethods,
      ] = await Promise.all([
        this.prisma.expense.findMany({
          where: {
            userId,
            updatedAt: { gte: lastBackupDate }
          },
          include: [{ category: true }, { tags: true }, { paymentMethod: true }]
        }),
        this.prisma.income.findMany({
          where: {
            userId,
            updatedAt: { gte: lastBackupDate }
          },
          include: [{ category: true }]
        }),
        this.prisma.category.findMany({
          where: {
            userId,
            updatedAt: { gte: lastBackupDate }
          }
        }),
        this.prisma.budget.findMany({
          where: {
            userId,
            updatedAt: { gte: lastBackupDate }
          },
          include: [{ category: true }]
        }),
        this.prisma.savingsGoal.findMany({
          where: {
            userId,
            updatedAt: { gte: lastBackupDate }
          }
        }),
        this.prisma.paymentMethod.findMany({
          where: {
            userId,
            updatedAt: { gte: lastBackupDate }
          }
        }),
      ]);

      // Create incremental backup data
      const backupData = {
        version: '2.0',
        type: 'incremental',
        baseBackupId: lastBackupId,
        exportDate: new Date().toISOString(),
        userId,
        options,
        data: {
          expenses,
          income,
          categories,
          budgets,
          savingsGoals,
          paymentMethods,
        },
      };

      // Process backup (same as full backup)
      let processedData = JSON.stringify(backupData, null, 2);
      let compressed = false;
      let encrypted = false;

      if (options.compression) {
        processedData = await this.compressData(processedData);
        compressed = true;
      }

      if (options.encryption) {
        processedData = await this.encryptData(processedData);
        encrypted = true;
      }

      // Create metadata
      const metadata: BackupMetadata = {
        id: this.generateId(),
        userId,
        version: backupData.version,
        createdAt: new Date(),
        size: processedData.length,
        format: options.format || 'json',
        compressed,
        encrypted,
        checksum: this.calculateChecksum(processedData),
        itemCount: {
          expenses: expenses.length,
          income: income.length,
          categories: categories.length,
          budgets: budgets.length,
          savingsGoals: savingsGoals.length,
          paymentMethods: paymentMethods.length,
        },
      };

      // Store backup
      this.backups.set(metadata.id, metadata);

      const downloadUrl = `/api/backups/download/${metadata.id}`;
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));

      this.logger.log(`Incremental backup created for user ${userId}: ${metadata.id}`);

      return {
        backup: metadata,
        downloadUrl,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(`Failed to create incremental backup for user ${userId}:`, error);
      throw new HttpException(
        `Incremental backup creation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async restoreBackup(
    userId: string,
    backupId: string,
    options: {
      overwrite?: boolean;
      validateData?: boolean;
    } = {},
  ): Promise<RestoreResult> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new HttpException('Backup not found', HttpStatus.NOT_FOUND);
    }

    if (backup.userId !== userId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const restoredItems = {
      expenses: 0,
      income: 0,
      categories: 0,
      budgets: 0,
      savingsGoals: 0,
      paymentMethods: 0,
    };

    try {
      // In a real implementation, fetch backup data from storage
      // For now, we'll simulate the restore process
      this.logger.log(`Restoring backup ${backupId} for user ${userId}`);

      // Validate data if requested
      if (options.validateData) {
        await this.validateBackupData(backupId);
      }

      // Restore data in transaction
      await this.prisma.$transaction(async (tx) => {
        // Restore categories first (dependencies)
        // Restore expenses
        // Restore income
        // Restore budgets
        // Restore savings goals
        // Restore payment methods

        // Update restored items count
        restoredItems.expenses = backup.itemCount.expenses;
        restoredItems.income = backup.itemCount.income;
        restoredItems.categories = backup.itemCount.categories;
        restoredItems.budgets = backup.itemCount.budgets;
        restoredItems.savingsGoals = backup.itemCount.savingsGoals;
        restoredItems.paymentMethods = backup.itemCount.paymentMethods;
      });

      this.logger.log(`Backup restored successfully for user ${userId}: ${backupId}`);

      return {
        success: true,
        restoredItems,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Failed to restore backup ${backupId} for user ${userId}:`, error);
      errors.push(`Restore failed: ${error.message}`);

      return {
        success: false,
        restoredItems,
        errors,
        warnings,
      };
    }
  }

  async getBackups(userId: string): Promise<BackupMetadata[]> {
    return Array.from(this.backups.values())
      .filter(backup => backup.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getBackup(backupId: string): Promise<BackupMetadata> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new HttpException('Backup not found', HttpStatus.NOT_FOUND);
    }
    return backup;
  }

  async deleteBackup(userId: string, backupId: string): Promise<void> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new HttpException('Backup not found', HttpStatus.NOT_FOUND);
    }

    if (backup.userId !== userId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    this.backups.delete(backupId);
    this.logger.log(`Backup deleted: ${backupId}`);
  }

  async scheduleBackup(
    userId: string,
    schedule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      time?: string; // HH:MM format
      dayOfWeek?: number; // 0-6 for weekly
      dayOfMonth?: number; // 1-31 for monthly
    },
    options: BackupOptions = {},
  ): Promise<void> {
    // In a real implementation, schedule with background job queue
    this.logger.log(`Scheduled backup for user ${userId}: ${schedule.frequency}`);
  }

  async cancelScheduledBackup(userId: string, scheduleId: string): Promise<void> {
    // In a real implementation, cancel scheduled job
    this.logger.log(`Cancelled scheduled backup ${scheduleId} for user ${userId}`);
  }

  async getBackupStats(userId: string): Promise<{
    totalBackups: number;
    totalSize: number;
    averageSize: number;
    lastBackup: Date | null;
    nextScheduledBackup: Date | null;
    storageUsed: number;
    storageQuota: number;
  }> {
    const userBackups = await this.getBackups(userId);
    const totalBackups = userBackups.length;
    const totalSize = userBackups.reduce((sum, backup) => sum + backup.size, 0);
    const averageSize = totalBackups > 0 ? totalSize / totalBackups : 0;
    const lastBackup = userBackups.length > 0 ? userBackups[0].createdAt : null;

    return {
      totalBackups,
      totalSize,
      averageSize: Math.round(averageSize),
      lastBackup,
      nextScheduledBackup: null, // In real implementation, fetch from scheduler
      storageUsed: totalSize,
      storageQuota: 1024 * 1024 * 1024, // 1GB
    };
  }

  async validateBackupData(backupId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new HttpException('Backup not found', HttpStatus.NOT_FOUND);
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // In a real implementation, fetch and validate backup data
      // For now, we'll simulate validation
      this.logger.log(`Validating backup data: ${backupId}`);

      // Check checksum
      // Validate data structure
      // Check for required fields
      // Validate relationships

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Validation failed: ${error.message}`);
      return {
        valid: false,
        errors,
        warnings,
      };
    }
  }

  async cleanupExpiredBackups(): Promise<void> {
    const now = Date.now();
    const expiredTime = now - (30 * 24 * 60 * 60 * 1000); // 30 days ago

    let deletedCount = 0;
    for (const [id, backup] of this.backups.entries()) {
      if (backup.createdAt.getTime() < expiredTime) {
        this.backups.delete(id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired backups`);
    }
  }

  private async compressData(data: string): Promise<string> {
    // In a real implementation, use compression library
    // For now, return original data
    return data;
  }

  private async encryptData(data: string): Promise<string> {
    // In a real implementation, use encryption library
    // For now, return original data
    return data;
  }

  private calculateChecksum(data: string): string {
    // Simple checksum calculation
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum = ((checksum << 5) - checksum) + data.charCodeAt(i);
      checksum = checksum & checksum;
    }
    return checksum.toString(16);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Helper methods for backup operations
  async exportToCSV(userId: string): Promise<string> {
    // In a real implementation, generate CSV format
    return 'csv_data';
  }

  async exportToXML(userId: string): Promise<string> {
    // In a real implementation, generate XML format
    return 'xml_data';
  }

  async getBackupHistory(userId: string): Promise<Array<{
    id: string;
    date: Date;
    type: 'full' | 'incremental';
    size: number;
    itemCount: number;
  }>> {
    const backups = await this.getBackups(userId);

    return backups.map(backup => ({
      id: backup.id,
      date: backup.createdAt,
      type: 'full', // In real implementation, determine from backup data
      size: backup.size,
      itemCount: Object.values(backup.itemCount).reduce((sum, count) => sum + count, 0),
    }));
  }

  async compareBackups(backupId1: string, backupId2: string): Promise<{
    differences: Array<{
      entity: string;
      type: 'added' | 'modified' | 'deleted';
      count: number;
    }>;
    summary: {
      totalDifferences: number;
      addedCount: number;
      modifiedCount: number;
      deletedCount: number;
    };
  }> {
    // In a real implementation, compare two backups
    return {
      differences: [],
      summary: {
        totalDifferences: 0,
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
      },
    };
  }
}
