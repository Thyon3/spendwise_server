import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  dateRange?: {
    from: Date;
    to: Date;
  };
  categories?: string[];
  tags?: string[];
  includeDeleted?: boolean;
  includeAttachments?: boolean;
  compression?: boolean;
}

export interface ExportResult {
  filename: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  expiresAt: Date;
}

@Injectable()
export class DataExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportUserData(userId: string, options: ExportOptions): Promise<ExportResult> {
    try {
      // Get user data based on export options
      const userData = await this.getUserData(userId, options);
      
      // Generate export file based on format
      const exportData = await this.generateExport(userData, options.format);
      
      // Create export record
      const exportRecord = await this.createExportRecord(userId, options, exportData);
      
      return {
        filename: exportRecord.filename,
        mimeType: this.getMimeType(options.format),
        size: exportData.length,
        downloadUrl: `/api/exports/download/${exportRecord.id}`,
        expiresAt: exportRecord.expiresAt,
      };
    } catch (error) {
      throw new HttpException(
        `Export failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async exportExpenses(userId: string, options: ExportOptions): Promise<ExportResult> {
    const expenses = await this.getExpenses(userId, options);
    const exportData = await this.generateExpenseExport(expenses, options.format);
    
    const exportRecord = await this.createExportRecord(userId, options, exportData);
    
    return {
      filename: exportRecord.filename,
      mimeType: this.getMimeType(options.format),
      size: exportData.length,
      downloadUrl: `/api/exports/download/${exportRecord.id}`,
      expiresAt: exportRecord.expiresAt,
    };
  }

  async exportIncome(userId: string, options: ExportOptions): Promise<ExportResult> {
    const income = await this.getIncome(userId, options);
    const exportData = await this.generateIncomeExport(income, options.format);
    
    const exportRecord = await this.createExportRecord(userId, options, exportData);
    
    return {
      filename: exportRecord.filename,
      mimeType: this.getMimeType(options.format),
      size: exportData.length,
      downloadUrl: `/api/exports/download/${exportRecord.id}`,
      expiresAt: exportRecord.expiresAt,
    };
  }

  async exportCategories(userId: string, options: ExportOptions): Promise<ExportResult> {
    const categories = await this.getCategories(userId, options);
    const exportData = await this.generateCategoryExport(categories, options.format);
    
    const exportRecord = await this.createExportRecord(userId, options, exportData);
    
    return {
      filename: exportRecord.filename,
      mimeType: this.getMimeType(options.format),
      size: exportData.length,
      downloadUrl: `/api/exports/download/${exportRecord.id}`,
      expiresAt: exportRecord.expiresAt,
    };
  }

  async exportBudgets(userId: string, options: ExportOptions): Promise<ExportResult> {
    const budgets = await this.getBudgets(userId, options);
    const exportData = await this.generateBudgetExport(budgets, options.format);
    
    const exportRecord = await this.createExportRecord(userId, options, exportData);
    
    return {
      filename: exportRecord.filename,
      mimeType: this.getMimeType(options.format),
      size: exportData.length,
      downloadUrl: `/api/exports/download/${exportRecord.id}`,
      expiresAt: exportRecord.expiresAt,
    };
  }

  async exportFullBackup(userId: string, options: ExportOptions): Promise<ExportResult> {
    const fullData = await this.getFullUserData(userId, options);
    const exportData = await this.generateFullExport(fullData, options.format);
    
    const exportRecord = await this.createExportRecord(userId, options, exportData);
    
    return {
      filename: exportRecord.filename,
      mimeType: this.getMimeType(options.format),
      size: exportData.length,
      downloadUrl: `/api/exports/download/${exportRecord.id}`,
      expiresAt: exportRecord.expiresAt,
    };
  }

  async getExportHistory(userId: string): Promise<Array<{
    id: string;
    filename: string;
    format: string;
    size: number;
    createdAt: Date;
    expiresAt: Date;
    downloadUrl: string;
    status: 'pending' | 'completed' | 'expired';
  }>> {
    // In a real implementation, this would query the export records table
    // For now, we'll return mock data
    return [
      {
        id: '1',
        filename: 'expenses_2024_01_15.json',
        format: 'json',
        size: 1024,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        downloadUrl: '/api/exports/download/1',
        status: 'completed',
      },
    ];
  }

  async deleteExport(userId: string, exportId: string): Promise<void> {
    // In a real implementation, this would delete the export record and file
    console.log(`Deleting export ${exportId} for user ${userId}`);
  }

  async cleanupExpiredExports(): Promise<void> {
    // In a real implementation, this would clean up expired exports
    console.log('Cleaning up expired exports');
  }

  private async getUserData(userId: string, options: ExportOptions): Promise<any> {
    const whereClause = this.buildWhereClause(userId, options);
    
    const [user, expenses, income, categories, budgets] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.expense.findMany({ where: whereClause }),
      this.prisma.income.findMany({ where: whereClause }),
      this.prisma.category.findMany({ where: { userId } }),
      this.prisma.budget.findMany({ where: whereClause }),
    ]);

    return {
      user,
      expenses,
      income,
      categories,
      budgets,
    };
  }

  private async getExpenses(userId: string, options: ExportOptions): Promise<any[]> {
    const whereClause = this.buildWhereClause(userId, options);
    
    return this.prisma.expense.findMany({
      where: whereClause,
      include: [
        { category: true },
        { tags: { include: { tag: true } } },
        { paymentMethod: true },
      ],
      orderBy: { date: 'desc' },
    });
  }

  private async getIncome(userId: string, options: ExportOptions): Promise<any[]> {
    const whereClause = this.buildWhereClause(userId, options);
    
    return this.prisma.income.findMany({
      where: whereClause,
      include: [{ category: true }],
      orderBy: { date: 'desc' },
    });
  }

  private async getCategories(userId: string, options: ExportOptions): Promise<any[]> {
    return this.prisma.category.findMany({
      where: { userId },
      include: [
        {
          expenses: options.dateRange ? {
            where: {
              date: {
                gte: options.dateRange.from,
                lte: options.dateRange.to,
              },
            },
          } : true,
        },
      ],
    });
  }

  private async getBudgets(userId: string, options: ExportOptions): Promise<any[]> {
    const whereClause = this.buildWhereClause(userId, options);
    
    return this.prisma.budget.findMany({
      where: whereClause,
      include: [{ category: true }],
    });
  }

  private async getFullUserData(userId: string, options: ExportOptions): Promise<any> {
    const whereClause = this.buildWhereClause(userId, options);
    
    const [
      user,
      expenses,
      income,
      categories,
      budgets,
      tags,
      paymentMethods,
      subscriptions,
    ] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.expense.findMany({ where: whereClause }),
      this.prisma.income.findMany({ where: whereClause }),
      this.prisma.category.findMany({ where: { userId } }),
      this.prisma.budget.findMany({ where: whereClause }),
      this.prisma.tag.findMany({ where: { userId } }),
      this.prisma.paymentMethod.findMany({ where: { userId } }),
      this.prisma.subscription.findMany({ where: whereClause }),
    ]);

    return {
      user,
      expenses,
      income,
      categories,
      budgets,
      tags,
      paymentMethods,
      subscriptions,
    };
  }

  private buildWhereClause(userId: string, options: ExportOptions): any {
    const where: any = { userId };

    if (options.dateRange) {
      where.date = {
        gte: options.dateRange.from,
        lte: options.dateRange.to,
      };
    }

    if (options.categories && options.categories.length > 0) {
      where.category = {
        name: { in: options.categories },
      };
    }

    if (options.tags && options.tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            name: { in: options.tags },
          },
        },
      };
    }

    if (!options.includeDeleted) {
      where.deletedAt = null;
    }

    return where;
  }

  private async generateExport(data: any, format: string): Promise<Buffer> {
    switch (format) {
      case 'json':
        return this.generateJsonExport(data);
      case 'csv':
        return this.generateCsvExport(data);
      case 'xlsx':
        return this.generateExcelExport(data);
      case 'pdf':
        return this.generatePdfExport(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async generateExpenseExport(expenses: any[], format: string): Promise<Buffer> {
    switch (format) {
      case 'json':
        return this.generateJsonExport(expenses);
      case 'csv':
        return this.generateExpenseCsv(expenses);
      case 'xlsx':
        return this.generateExpenseExcel(expenses);
      case 'pdf':
        return this.generateExpensePdf(expenses);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async generateIncomeExport(income: any[], format: string): Promise<Buffer> {
    switch (format) {
      case 'json':
        return this.generateJsonExport(income);
      case 'csv':
        return this.generateIncomeCsv(income);
      case 'xlsx':
        return this.generateIncomeExcel(income);
      case 'pdf':
        return this.generateIncomePdf(income);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async generateCategoryExport(categories: any[], format: string): Promise<Buffer> {
    switch (format) {
      case 'json':
        return this.generateJsonExport(categories);
      case 'csv':
        return this.generateCategoryCsv(categories);
      case 'xlsx':
        return this.generateCategoryExcel(categories);
      case 'pdf':
        return this.generateCategoryPdf(categories);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async generateBudgetExport(budgets: any[], format: string): Promise<Buffer> {
    switch (format) {
      case 'json':
        return this.generateJsonExport(budgets);
      case 'csv':
        return this.generateBudgetCsv(budgets);
      case 'xlsx':
        return this.generateBudgetExcel(budgets);
      case 'pdf':
        return this.generateBudgetPdf(budgets);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async generateFullExport(data: any, format: string): Promise<Buffer> {
    switch (format) {
      case 'json':
        return this.generateJsonExport(data);
      case 'csv':
        return this.generateFullCsv(data);
      case 'xlsx':
        return this.generateFullExcel(data);
      case 'pdf':
        return this.generateFullPdf(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generateJsonExport(data: any): Buffer {
    return Buffer.from(JSON.stringify(data, null, 2));
  }

  private generateExpenseCsv(expenses: any[]): Buffer {
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Tags', 'Payment Method'];
    const rows = expenses.map(expense => [
      expense.date.toISOString().split('T')[0],
      expense.description || '',
      expense.amount.toString(),
      expense.category?.name || '',
      expense.tags?.map((t: any) => t.tag.name).join(';') || '',
      expense.paymentMethod?.name || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    return Buffer.from(csvContent);
  }

  private generateIncomeCsv(income: any[]): Buffer {
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Source'];
    const rows = income.map(item => [
      item.date.toISOString().split('T')[0],
      item.description || '',
      item.amount.toString(),
      item.category?.name || '',
      item.source || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    return Buffer.from(csvContent);
  }

  private generateCategoryCsv(categories: any[]): Buffer {
    const headers = ['Name', 'Color', 'Expense Count', 'Total Amount'];
    const rows = categories.map(category => [
      category.name,
      category.color || '',
      category.expenses?.length.toString() || '0',
      category.expenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0).toString() || '0',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    return Buffer.from(csvContent);
  }

  private generateBudgetCsv(budgets: any[]): Buffer {
    const headers = ['Name', 'Amount', 'Spent', 'Remaining', 'Start Date', 'End Date'];
    const rows = budgets.map(budget => [
      budget.name,
      budget.amount.toString(),
      budget.spent?.toString() || '0',
      (budget.amount - (budget.spent || 0)).toString(),
      budget.startDate.toISOString().split('T')[0],
      budget.endDate.toISOString().split('T')[0],
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    return Buffer.from(csvContent);
  }

  private generateFullCsv(data: any): Buffer {
    // Simplified full export - in reality, this would be more complex
    return this.generateJsonExport(data);
  }

  private generateExcelExport(data: any): Buffer {
    // In a real implementation, use a library like xlsx
    return this.generateJsonExport(data);
  }

  private generateExpenseExcel(expenses: any[]): Buffer {
    // In a real implementation, use a library like xlsx
    return this.generateExpenseCsv(expenses);
  }

  private generateIncomeExcel(income: any[]): Buffer {
    // In a real implementation, use a library like xlsx
    return this.generateIncomeCsv(income);
  }

  private generateCategoryExcel(categories: any[]): Buffer {
    // In a real implementation, use a library like xlsx
    return this.generateCategoryCsv(categories);
  }

  private generateBudgetExcel(budgets: any[]): Buffer {
    // In a real implementation, use a library like xlsx
    return this.generateBudgetCsv(budgets);
  }

  private generateFullExcel(data: any): Buffer {
    // In a real implementation, use a library like xlsx
    return this.generateFullCsv(data);
  }

  private generatePdfExport(data: any): Buffer {
    // In a real implementation, use a library like puppeteer or pdfkit
    return this.generateJsonExport(data);
  }

  private generateExpensePdf(expenses: any[]): Buffer {
    // In a real implementation, use a library like puppeteer or pdfkit
    return this.generateExpenseCsv(expenses);
  }

  private generateIncomePdf(income: any[]): Buffer {
    // In a real implementation, use a library like puppeteer or pdfkit
    return this.generateIncomeCsv(income);
  }

  private generateCategoryPdf(categories: any[]): Buffer {
    // In a real implementation, use a library like puppeteer or pdfkit
    return this.generateCategoryCsv(categories);
  }

  private generateBudgetPdf(budgets: any[]): Buffer {
    // In a real implementation, use a library like puppeteer or pdfkit
    return this.generateBudgetCsv(budgets);
  }

  private generateFullPdf(data: any): Buffer {
    // In a real implementation, use a library like puppeteer or pdfkit
    return this.generateFullCsv(data);
  }

  private getMimeType(format: string): string {
    const mimeTypes = {
      json: 'application/json',
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
    };

    return mimeTypes[format] || 'application/octet-stream';
  }

  private async createExportRecord(userId: string, options: ExportOptions, data: Buffer): Promise<any> {
    // In a real implementation, this would save to a database
    const filename = `export_${Date.now()}.${options.format}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      id: Date.now().toString(),
      filename,
      format: options.format,
      size: data.length,
      createdAt: new Date(),
      expiresAt,
    };
  }
}
