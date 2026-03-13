import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';
import { CustomLoggerService } from '../../infrastructure/logging/logger.service';

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export enum TenantPlan {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private logger: CustomLoggerService,
  ) {}

  async createTenant(data: {
    name: string;
    domain: string;
    plan: TenantPlan;
    ownerId: string;
    settings?: any;
  }) {
    try {
      const tenant = await this.prisma.tenant.create({
        data: {
          ...data,
          status: TenantStatus.TRIAL,
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          settings: data.settings || {},
        },
      });

      // Add owner as admin user
      await this.prisma.user.update({
        where: { id: data.ownerId },
        data: { tenantId: tenant.id },
      });

      this.logger.log(`Tenant created: ${tenant.name}`, { tenantId: tenant.id });
      
      return tenant;
    } catch (error) {
      this.logger.error('Failed to create tenant', error.stack);
      throw new Error('Tenant creation failed');
    }
  }

  async getTenantById(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  async getTenantByDomain(domain: string) {
    return this.prisma.tenant.findUnique({
      where: { domain },
      include: {
        users: true,
      },
    });
  }

  async updateTenant(tenantId: string, data: Partial<{
    name: string;
    domain: string;
    plan: TenantPlan;
    status: TenantStatus;
    settings: any;
  }>) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    this.logger.log(`Tenant updated: ${tenant.name}`, { tenantId, changes: data });
    
    return tenant;
  }

  async updateTenantPlan(tenantId: string, newPlan: TenantPlan) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { 
        plan: newPlan,
        planUpdatedAt: new Date(),
      },
    });

    // Apply plan limits
    await this.applyPlanLimits(tenantId, newPlan);

    this.logger.log(`Tenant plan updated: ${tenant.name} -> ${newPlan}`, { tenantId });
    
    return tenant;
  }

  async suspendTenant(tenantId: string, reason: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: TenantStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspensionReason: reason,
      },
    });

    this.logger.warn(`Tenant suspended: ${tenant.name}`, { tenantId, reason });
    
    return tenant;
  }

  async activateTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: TenantStatus.ACTIVE,
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    this.logger.log(`Tenant activated: ${tenant.name}`, { tenantId });
    
    return tenant;
  }

  async addUserToTenant(tenantId: string, userId: string, role: string = 'USER') {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is already in tenant
    const existingUserTenant = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (existingUserTenant) {
      throw new Error('User already belongs to this tenant');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        tenantId,
        role,
      },
    });

    this.logger.log(`User added to tenant: ${userId} -> ${tenantId}`, { tenantId, userId, role });
  }

  async removeUserFromTenant(tenantId: string, userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        tenantId: null,
        role: 'USER',
      },
    });

    this.logger.log(`User removed from tenant: ${userId} <- ${tenantId}`, { tenantId, userId });
  }

  async getTenantUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getTenantStats(tenantId: string) {
    const [
      userCount,
      expenseCount,
      incomeCount,
      budgetCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.expense.count({ 
        where: { user: { tenantId } }
      }),
      this.prisma.income.count({ 
        where: { user: { tenantId } }
      }),
      this.prisma.budget.count({ 
        where: { user: { tenantId } }
      }),
    ]);

    return {
      userCount,
      expenseCount,
      incomeCount,
      budgetCount,
    };
  }

  async checkTenantLimits(tenantId: string): Promise<{
    withinLimits: boolean;
    limits: any;
    current: any;
    exceeded: string[];
  }> {
    const tenant = await this.getTenantById(tenantId);
    const stats = await this.getTenantStats(tenantId);
    const limits = this.getPlanLimits(tenant.plan);

    const exceeded: string[] = [];

    if (stats.userCount > limits.maxUsers) {
      exceeded.push('users');
    }

    if (stats.expenseCount > limits.maxExpenses) {
      exceeded.push('expenses');
    }

    return {
      withinLimits: exceeded.length === 0,
      limits,
      current: stats,
      exceeded,
    };
  }

  private getPlanLimits(plan: TenantPlan) {
    const limits = {
      [TenantPlan.FREE]: {
        maxUsers: 2,
        maxExpenses: 100,
        maxIncome: 50,
        maxBudgets: 5,
        features: ['basic_expenses', 'basic_reports'],
      },
      [TenantPlan.BASIC]: {
        maxUsers: 5,
        maxExpenses: 1000,
        maxIncome: 500,
        maxBudgets: 20,
        features: ['basic_expenses', 'basic_reports', 'categories', 'tags'],
      },
      [TenantPlan.PROFESSIONAL]: {
        maxUsers: 20,
        maxExpenses: 10000,
        maxIncome: 5000,
        maxBudgets: 100,
        features: ['basic_expenses', 'basic_reports', 'categories', 'tags', 'analytics', 'api_access'],
      },
      [TenantPlan.ENTERPRISE]: {
        maxUsers: -1, // Unlimited
        maxExpenses: -1, // Unlimited
        maxIncome: -1, // Unlimited
        maxBudgets: -1, // Unlimited
        features: ['all'],
      },
    };

    return limits[plan] || limits[TenantPlan.FREE];
  }

  private async applyPlanLimits(tenantId: string, plan: TenantPlan) {
    const limits = this.getPlanLimits(plan);
    const stats = await this.getTenantStats(tenantId);

    // If exceeding limits, you might want to:
    // - Send notifications
    // - Restrict certain features
    // - Upgrade automatically
    
    if (stats.userCount > limits.maxUsers && limits.maxUsers !== -1) {
      this.logger.warn(`Tenant ${tenantId} exceeds user limit`, {
        current: stats.userCount,
        limit: limits.maxUsers,
      });
    }
  }

  async getTenantUsageMetrics(tenantId: string, period: 'daily' | 'weekly' | 'monthly') {
    const dateFilter = this.getDateFilter(period);
    
    const [newUsers, newExpenses, newIncome] = await Promise.all([
      this.prisma.user.count({
        where: {
          tenantId,
          createdAt: {
            gte: dateFilter.startDate,
            lte: dateFilter.endDate,
          },
        },
      }),
      this.prisma.expense.count({
        where: {
          user: { tenantId },
          createdAt: {
            gte: dateFilter.startDate,
            lte: dateFilter.endDate,
          },
        },
      }),
      this.prisma.income.count({
        where: {
          user: { tenantId },
          createdAt: {
            gte: dateFilter.startDate,
            lte: dateFilter.endDate,
          },
        },
      }),
    ]);

    return {
      period,
      newUsers,
      newExpenses,
      newIncome,
      dateRange: dateFilter,
    };
  }

  private getDateFilter(period: 'daily' | 'weekly' | 'monthly') {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return { startDate, endDate };
  }

  async migrateTenantData(fromTenantId: string, toTenantId: string) {
    // This would be a complex operation to migrate all data
    // For now, just log the action
    this.logger.log(`Tenant data migration initiated`, {
      fromTenantId,
      toTenantId,
    });

    // In a real implementation, you would:
    // 1. Validate the migration
    // 2. Create backup
    // 3. Transfer all user data
    // 4. Update references
    // 5. Verify integrity
    // 6. Clean up old data
  }

  async archiveTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: TenantStatus.INACTIVE,
        archivedAt: new Date(),
      },
    });

    // Archive all data (move to archive tables or mark as archived)
    this.logger.log(`Tenant archived: ${tenant.name}`, { tenantId });
    
    return tenant;
  }

  async deleteTenant(tenantId: string) {
    // This would permanently delete all tenant data
    // Should require multiple confirmations and backups
    
    await this.prisma.tenant.delete({
      where: { id: tenantId },
    });

    this.logger.warn(`Tenant permanently deleted: ${tenantId}`, { tenantId });
  }
}
