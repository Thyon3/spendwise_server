import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'push' | 'sms' | 'in_app';
  category: 'transaction' | 'budget' | 'goal' | 'security' | 'system' | 'marketing';
  subject: string;
  content: string;
  variables: string[];
  htmlContent?: string;
  smsContent?: string;
  pushContent?: string;
  inAppContent?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean';
  defaultValue?: any;
  required: boolean;
  description?: string;
}

export interface CompiledTemplate {
  subject: string;
  content: string;
  htmlContent?: string;
  smsContent?: string;
  pushContent?: string;
  inAppContent?: string;
  variables: Record<string, any>;
}

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);
  private readonly templates = new Map<string, NotificationTemplate>();

  constructor(private readonly configService: ConfigService) {
    this.initializeDefaultTemplates();
  }

  async createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    const newTemplate: NotificationTemplate = {
      ...template,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(newTemplate.id, newTemplate);
    this.logger.log(`Created notification template: ${newTemplate.name}`);

    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const existingTemplate = this.templates.get(id);
    if (!existingTemplate) {
      throw new Error(`Template not found: ${id}`);
    }

    const updatedTemplate: NotificationTemplate = {
      ...existingTemplate,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(id, updatedTemplate);
    this.logger.log(`Updated notification template: ${updatedTemplate.name}`);

    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    this.templates.delete(id);
    this.logger.log(`Deleted notification template: ${template.name}`);
  }

  async getTemplate(id: string): Promise<NotificationTemplate | null> {
    return this.templates.get(id) || null;
  }

  async getTemplates(filter?: {
    type?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<NotificationTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (filter) {
      if (filter.type) {
        templates = templates.filter(t => t.type === filter.type);
      }
      if (filter.category) {
        templates = templates.filter(t => t.category === filter.category);
      }
      if (filter.isActive !== undefined) {
        templates = templates.filter(t => t.isActive === filter.isActive);
      }
    }

    return templates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async compileTemplate(id: string, variables: Record<string, any>): Promise<CompiledTemplate> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    if (!template.isActive) {
      throw new Error(`Template is not active: ${id}`);
    }

    // Validate required variables
    this.validateVariables(template, variables);

    // Compile template content
    const compiledTemplate: CompiledTemplate = {
      subject: this.compileString(template.subject, variables),
      content: this.compileString(template.content, variables),
      variables,
    };

    if (template.htmlContent) {
      compiledTemplate.htmlContent = this.compileString(template.htmlContent, variables);
    }
    if (template.smsContent) {
      compiledTemplate.smsContent = this.compileString(template.smsContent, variables);
    }
    if (template.pushContent) {
      compiledTemplate.pushContent = this.compileString(template.pushContent, variables);
    }
    if (template.inAppContent) {
      compiledTemplate.inAppContent = this.compileString(template.inAppContent, variables);
    }

    return compiledTemplate;
  }

  async getTemplateVariables(id: string): Promise<TemplateVariable[]> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    return this.extractVariables(template);
  }

  async duplicateTemplate(id: string, newName: string): Promise<NotificationTemplate> {
    const originalTemplate = this.templates.get(id);
    if (!originalTemplate) {
      throw new Error(`Template not found: ${id}`);
    }

    const duplicatedTemplate: NotificationTemplate = {
      ...originalTemplate,
      id: this.generateId(),
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(duplicatedTemplate.id, duplicatedTemplate);
    this.logger.log(`Duplicated notification template: ${duplicatedTemplate.name}`);

    return duplicatedTemplate;
  }

  async previewTemplate(id: string, variables: Record<string, any>): Promise<CompiledTemplate> {
    // Create a preview with sample data if variables are missing
    const previewVariables = this.generatePreviewVariables(id, variables);
    return this.compileTemplate(id, previewVariables);
  }

  async activateTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    await this.updateTemplate(id, { isActive: true });
    this.logger.log(`Activated notification template: ${template.name}`);
  }

  async deactivateTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    await this.updateTemplate(id, { isActive: false });
    this.logger.log(`Deactivated notification template: ${template.name}`);
  }

  async getTemplateStats(): Promise<{
    totalTemplates: number;
    activeTemplates: number;
    templatesByType: Record<string, number>;
    templatesByCategory: Record<string, number>;
    recentlyCreated: NotificationTemplate[];
    recentlyUpdated: NotificationTemplate[];
  }> {
    const templates = Array.from(this.templates.values());
    const activeTemplates = templates.filter(t => t.isActive);

    const templatesByType: Record<string, number> = {};
    const templatesByCategory: Record<string, number> = {};

    for (const template of templates) {
      templatesByType[template.type] = (templatesByType[template.type] || 0) + 1;
      templatesByCategory[template.category] = (templatesByCategory[template.category] || 0) + 1;
    }

    const recentlyCreated = templates
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    const recentlyUpdated = templates
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5);

    return {
      totalTemplates: templates.length,
      activeTemplates: activeTemplates.length,
      templatesByType,
      templatesByCategory,
      recentlyCreated,
      recentlyUpdated,
    };
  }

  async validateTemplate(template: NotificationTemplate): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.subject || template.subject.trim().length === 0) {
      errors.push('Template subject is required');
    }

    if (!template.content || template.content.trim().length === 0) {
      errors.push('Template content is required');
    }

    // Validate variables
    const extractedVariables = this.extractVariables(template);
    const declaredVariables = template.variables;

    for (const declaredVar of declaredVariables) {
      if (!extractedVariables.some(v => v.name === declaredVar)) {
        warnings.push(`Declared variable '${declaredVar}' is not used in template`);
      }
    }

    for (const extractedVar of extractedVariables) {
      if (!declaredVariables.includes(extractedVar.name)) {
        warnings.push(`Used variable '${extractedVar.name}' is not declared in template`);
      }
    }

    // Validate template syntax
    try {
      this.compileString(template.subject, {});
      this.compileString(template.content, {});
    } catch (error) {
      errors.push(`Template syntax error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async searchTemplates(query: string): Promise<NotificationTemplate[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.subject.toLowerCase().includes(lowerQuery) ||
      template.content.toLowerCase().includes(lowerQuery) ||
      template.category.toLowerCase().includes(lowerQuery)
    );
  }

  private compileString(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}\}/g, (match, variableName) => {
      const value = variables[variableName];
      if (value === undefined) {
        throw new Error(`Variable not found: ${variableName}`);
      }
      return String(value);
    });
  }

  private validateVariables(template: NotificationTemplate, variables: Record<string, any>): void {
    for (const variableName of template.variables) {
      if (template.variables.includes(variableName) && variables[variableName] === undefined) {
        throw new Error(`Required variable not provided: ${variableName}`);
      }
    }
  }

  private extractVariables(template: NotificationTemplate): TemplateVariable[] {
    const variables: TemplateVariable[] = [];
    const regex = /\{\{(\w+)\}\}/g;
    let match;

    while ((match = regex.exec(template.subject)) !== null) {
      const variableName = match[1];
      if (!variables.some(v => v.name === variableName)) {
        variables.push({
          name: variableName,
          type: 'string',
          required: true,
          description: `Variable used in subject: ${variableName}`,
        });
      }
    }

    while ((match = regex.exec(template.content)) !== null) {
      const variableName = match[1];
      if (!variables.some(v => v.name === variableName)) {
        variables.push({
          name: variableName,
          type: 'string',
          required: true,
          description: `Variable used in content: ${variableName}`,
        });
      }
    }

    return variables;
  }

  private generatePreviewVariables(id: string, providedVariables: Record<string, any>): Record<string, any> {
    const template = this.templates.get(id);
    if (!template) {
      return providedVariables;
    }

    const previewVariables = { ...providedVariables };
    const extractedVariables = this.extractVariables(template);

    for (const variable of extractedVariables) {
      if (!previewVariables[variable.name]) {
        switch (variable.type) {
          case 'string':
            previewVariables[variable.name] = `[${variable.name}]`;
            break;
          case 'number':
            previewVariables[variable.name] = 0;
            break;
          case 'date':
            previewVariables[variable.name] = new Date().toISOString();
            break;
          case 'currency':
            previewVariables[variable.name] = '$0.00';
            break;
          case 'boolean':
            previewVariables[variable.name] = false;
            break;
        }
      }
    }

    return previewVariables;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private initializeDefaultTemplates(): void {
    // Welcome email template
    this.createTemplate({
      name: 'Welcome Email',
      type: 'email',
      category: 'transaction',
      subject: 'Welcome to Expense Tracker, {{userName}}!',
      content: 'Hello {{userName}},\n\nWelcome to Expense Tracker! We\'re excited to have you on board.\n\nYour account has been successfully created with email {{userEmail}}.\n\nBest regards,\nThe Expense Tracker Team',
      variables: ['userName', 'userEmail'],
      htmlContent: `
        <h1>Welcome to Expense Tracker, {{userName}}!</h1>
        <p>Hello {{userName}},</p>
        <p>Welcome to Expense Tracker! We're excited to have you on board.</p>
        <p>Your account has been successfully created with email {{userEmail}}.</p>
        <p>Best regards,<br>The Expense Tracker Team</p>
      `,
      isActive: true,
    });

    // Budget exceeded notification
    this.createTemplate({
      name: 'Budget Exceeded',
      type: 'push',
      category: 'budget',
      subject: 'Budget Alert: {{budgetName}} Exceeded',
      content: 'You have exceeded your budget for {{budgetName}}. Current spending: {{currentAmount}} of {{budgetAmount}}',
      variables: ['budgetName', 'currentAmount', 'budgetAmount'],
      pushContent: 'Budget Alert: {{budgetName}} exceeded! You\'ve spent {{currentAmount}} of {{budgetAmount}}',
      isActive: true,
    });

    // Goal achieved notification
    this.createTemplate({
      name: 'Goal Achieved',
      type: 'email',
      category: 'goal',
      subject: 'Congratulations! You achieved your goal: {{goalName}}',
      content: 'Congratulations {{userName}}! You have successfully achieved your goal: {{goalName}}.\n\nTarget amount: {{targetAmount}}\nAchieved amount: {{achievedAmount}}\nAchievement date: {{achievementDate}}',
      variables: ['userName', 'goalName', 'targetAmount', 'achievedAmount', 'achievementDate'],
      htmlContent: `
        <h2>Congratulations! 🎉</h2>
        <p>Hello {{userName}},</p>
        <p>You have successfully achieved your goal: <strong>{{goalName}}</strong></p>
        <ul>
          <li>Target amount: {{targetAmount}}</li>
          <li>Achieved amount: {{achievedAmount}}</li>
          <li>Achievement date: {{achievementDate}}</li>
        </ul>
        <p>Keep up the great work!</p>
      `,
      isActive: true,
    });

    // Security alert
    this.createTemplate({
      name: 'Security Alert',
      type: 'email',
      category: 'security',
      subject: 'Security Alert: Suspicious Activity Detected',
      content: 'We detected suspicious activity on your account.\n\nActivity: {{activity}}\nIP Address: {{ipAddress}}\nTime: {{timestamp}}\n\nIf this was not you, please secure your account immediately.',
      variables: ['activity', 'ipAddress', 'timestamp'],
      htmlContent: `
        <h2>Security Alert 🔒</h2>
        <p>We detected suspicious activity on your account.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
          <p><strong>Activity:</strong> {{activity}}</p>
          <p><strong>IP Address:</strong> {{ipAddress}}</p>
          <p><strong>Time:</strong> {{timestamp}}</p>
        </div>
        <p>If this was not you, please secure your account immediately.</p>
      `,
      isActive: true,
    });

    // Low balance warning
    this.createTemplate({
      name: 'Low Balance Warning',
      type: 'sms',
      category: 'transaction',
      subject: 'Low Balance Alert',
      content: 'Your account balance is low: {{balance}}. Consider adding funds to avoid service interruption.',
      variables: ['balance'],
      smsContent: 'Low balance alert: Your account balance is {{balance}}. Add funds to avoid interruption.',
      isActive: true,
    });

    // Monthly report
    this.createTemplate({
      name: 'Monthly Report',
      type: 'email',
      category: 'system',
      subject: 'Your Monthly Expense Report - {{month}} {{year}}',
      content: 'Here\'s your monthly expense report for {{month}} {{year}}:\n\nTotal Expenses: {{totalExpenses}}\nTotal Income: {{totalIncome}}\nNet Savings: {{netSavings}}\n\nTop Categories: {{topCategories}}',
      variables: ['month', 'year', 'totalExpenses', 'totalIncome', 'netSavings', 'topCategories'],
      htmlContent: `
        <h1>Monthly Expense Report</h1>
        <h2>{{month}} {{year}}</h2>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1; background: #e8f5e8; padding: 15px; border-radius: 5px;">
            <h3>Total Expenses</h3>
            <p style="font-size: 24px; color: #d32f2f;">{{totalExpenses}}</p>
          </div>
          <div style="flex: 1; background: #e3f2fd; padding: 15px; border-radius: 5px;">
            <h3>Total Income</h3>
            <p style="font-size: 24px; color: #1976d2;">{{totalIncome}}</p>
          </div>
          <div style="flex: 1; background: #f3e5f5; padding: 15px; border-radius: 5px;">
            <h3>Net Savings</h3>
            <p style="font-size: 24px; color: #7b1fa2;">{{netSavings}}</p>
          </div>
        </div>
        <h3>Top Categories</h3>
        <p>{{topCategories}}</p>
      `,
      isActive: true,
    });

    this.logger.log('Initialized default notification templates');
  }
}
