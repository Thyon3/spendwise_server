import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

export enum Permission {
  // User permissions
  READ_OWN_DATA = 'READ_OWN_DATA',
  WRITE_OWN_DATA = 'WRITE_OWN_DATA',
  DELETE_OWN_DATA = 'DELETE_OWN_DATA',

  // Manager permissions
  READ_TEAM_DATA = 'READ_TEAM_DATA',
  MANAGE_TEAM_USERS = 'MANAGE_TEAM_USERS',
  APPROVE_EXPENSES = 'APPROVE_EXPENSES',

  // Admin permissions
  READ_ALL_DATA = 'READ_ALL_DATA',
  WRITE_ALL_DATA = 'WRITE_ALL_DATA',
  DELETE_ALL_DATA = 'DELETE_ALL_DATA',
  MANAGE_SYSTEM = 'MANAGE_SYSTEM',

  // Viewer permissions
  READ_ONLY = 'READ_ONLY',
}

export const ROLE_PERMISSIONS = {
  [Role.ADMIN]: [
    Permission.READ_ALL_DATA,
    Permission.WRITE_ALL_DATA,
    Permission.DELETE_ALL_DATA,
    Permission.MANAGE_SYSTEM,
    Permission.READ_TEAM_DATA,
    Permission.MANAGE_TEAM_USERS,
    Permission.APPROVE_EXPENSES,
    Permission.READ_OWN_DATA,
    Permission.WRITE_OWN_DATA,
    Permission.DELETE_OWN_DATA,
  ],
  [Role.MANAGER]: [
    Permission.READ_TEAM_DATA,
    Permission.MANAGE_TEAM_USERS,
    Permission.APPROVE_EXPENSES,
    Permission.READ_OWN_DATA,
    Permission.WRITE_OWN_DATA,
    Permission.DELETE_OWN_DATA,
  ],
  [Role.USER]: [
    Permission.READ_OWN_DATA,
    Permission.WRITE_OWN_DATA,
    Permission.DELETE_OWN_DATA,
  ],
  [Role.VIEWER]: [
    Permission.READ_ONLY,
    Permission.READ_OWN_DATA,
  ],
};

@Injectable()
export class RbacService {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) { }

  async assignRoleToUser(userId: string, role: Role, assignedBy: string): Promise<void> {
    // Check if the assigner has permission
    const assignerRole = await this.getUserRole(assignedBy);
    if (!this.canAssignRole(assignerRole, role)) {
      throw new Error('Insufficient permissions to assign this role');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        role,
        roleAssignedBy: assignedBy,
        roleAssignedAt: new Date(),
      },
    });
  }

  async getUserRole(userId: string): Promise<Role> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role || Role.USER;
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const role = await this.getUserRole(userId);
    return ROLE_PERMISSIONS[role] || [];
  }

  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.includes(permission);
  }

  async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every(permission => userPermissions.includes(permission));
  }

  async canAccessResource(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string
  ): Promise<boolean> {
    const role = await this.getUserRole(userId);
    const permissions = ROLE_PERMISSIONS[role] || [];

    // Admin can access everything
    if (role === Role.ADMIN) {
      return true;
    }

    // Check resource ownership
    const isOwner = await this.isResourceOwner(userId, resourceType, resourceId);

    switch (action) {
      case 'read':
        return this.canRead(role, permissions, isOwner);
      case 'write':
        return this.canWrite(role, permissions, isOwner);
      case 'delete':
        return this.canDelete(role, permissions, isOwner);
      default:
        return false;
    }
  }

  async getUsersByRole(role: Role): Promise<any[]> {
    return this.prisma.user.findMany({
      where: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async createCustomRole(
    roleName: string,
    permissions: Permission[],
    createdBy: string
  ): Promise<void> {
    // Only admins can create custom roles
    const creatorRole = await this.getUserRole(createdBy);
    if (creatorRole !== Role.ADMIN) {
      throw new Error('Only admins can create custom roles');
    }

    // This would require extending the database schema
    // For now, log the action
    console.log(`Custom role ${roleName} created with permissions:`, permissions);
  }

  async getRoleHierarchy(): Promise<any[]> {
    return [
      { role: Role.ADMIN, level: 4, parent: null },
      { role: Role.MANAGER, level: 3, parent: Role.ADMIN },
      { role: Role.USER, level: 2, parent: Role.MANAGER },
      { role: Role.VIEWER, level: 1, parent: Role.USER },
    ];
  }

  async auditRoleChange(
    userId: string,
    oldRole: Role,
    newRole: Role,
    changedBy: string
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'ROLE_CHANGE',
        entityType: 'USER',
        entityId: userId,
        oldValue: JSON.stringify({ role: oldRole }),
        newValue: JSON.stringify({ role: newRole }),
        ipAddress: '', // Would be populated from request context
        userAgent: '', // Would be populated from request context
      },
    });
  }

  private canAssignRole(assignerRole: Role, targetRole: Role): boolean {
    const hierarchy: Record<Role, Role[]> = {
      [Role.ADMIN]: [Role.ADMIN, Role.MANAGER, Role.USER, Role.VIEWER],
      [Role.MANAGER]: [Role.USER, Role.VIEWER],
      [Role.USER]: [Role.VIEWER],
      [Role.VIEWER]: [],
    };

    return hierarchy[assignerRole]?.includes(targetRole) || false;
  }

  private async isResourceOwner(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    switch (resourceType) {
      case 'expense':
        const expense = await this.prisma.expense.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        return expense?.userId === userId;

      case 'income':
        const income = await this.prisma.income.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        return income?.userId === userId;

      case 'budget':
        const budget = await this.prisma.budget.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        return budget?.userId === userId;

      default:
        return false;
    }
  }

  private canRead(role: Role, permissions: Permission[], isOwner: boolean): boolean {
    if (isOwner && permissions.includes(Permission.READ_OWN_DATA)) {
      return true;
    }
    return permissions.includes(Permission.READ_ALL_DATA) ||
      permissions.includes(Permission.READ_TEAM_DATA) ||
      permissions.includes(Permission.READ_ONLY);
  }

  private canWrite(role: Role, permissions: Permission[], isOwner: boolean): boolean {
    if (isOwner && permissions.includes(Permission.WRITE_OWN_DATA)) {
      return true;
    }
    return permissions.includes(Permission.WRITE_ALL_DATA);
  }

  private canDelete(role: Role, permissions: Permission[], isOwner: boolean): boolean {
    if (isOwner && permissions.includes(Permission.DELETE_OWN_DATA)) {
      return true;
    }
    return permissions.includes(Permission.DELETE_ALL_DATA);
  }

  async getTeamMembers(managerId: string): Promise<any[]> {
    // This would require extending the schema to include team relationships
    // For now, return all users (simplified)
    return this.prisma.user.findMany({
      where: {
        id: { not: managerId }, // Exclude the manager themselves
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  async getPermissionAuditLog(userId: string): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: {
        userId,
        action: { in: ['ROLE_CHANGE', 'PERMISSION_DENIED', 'RESOURCE_ACCESS'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
