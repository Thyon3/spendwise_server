import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  template?: string;
  templateData?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  priority?: 'low' | 'normal' | 'high';
  replyTo?: string;
  from?: string;
  headers?: Record<string, string>;
  sendAt?: Date;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  contentId?: string;
  encoding?: string;
  disposition?: 'inline' | 'attachment';
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailDeliveryStatus {
  id: string;
  messageId: string;
  to: string;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  bouncedAt?: Date;
  opens: number;
  clicks: number;
  lastOpenedAt?: Date;
  lastClickedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailStats {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalFailed: number;
  deliveryRate: number;
  bounceRate: number;
  averageOpenRate: number;
  averageClickRate: number;
  topOpens: Array<{
    email: string;
    opens: number;
  }>;
  topClicks: Array<{
    email: string;
    clicks: number;
  }>;
}

@Injectable()
export class EnhancedEmailService {
  private readonly logger = new Logger(EnhancedEmailService.name);
  private readonly templates = new Map<string, EmailTemplate>();
  private readonly deliveryStatus = new Map<string, EmailDeliveryStatus>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.initializeDefaultTemplates();
  }

  async sendEmail(options: EmailOptions): Promise<{
    messageId: string;
    status: string;
  }> {
    try {
      const messageId = this.generateMessageId();
      
      // Process template if provided
      let subject = options.subject;
      let htmlContent = options.html;
      let textContent = options.text;
      
      if (options.template) {
        const template = this.templates.get(options.template);
        if (!template) {
          throw new HttpException(`Template not found: ${options.template}`, HttpStatus.NOT_FOUND);
        }
        
        subject = this.processTemplate(template.subject, options.templateData || {});
        htmlContent = this.processTemplate(template.htmlContent, options.templateData || {});
        textContent = this.processTemplate(template.textContent, options.templateData || {});
      }

      // Create delivery status
      const deliveryStatus: EmailDeliveryStatus = {
        id: this.generateId(),
        messageId,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        opens: 0,
        clicks: 0,
      };

      this.deliveryStatus.set(deliveryStatus.id, deliveryStatus);

      // Prepare email data
      const emailData = {
        messageId,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject,
        htmlContent,
        textContent,
        attachments: options.attachments,
        priority: options.priority || 'normal',
        replyTo: options.replyTo,
        from: options.from || this.configService.get('EMAIL_FROM', 'noreply@expensetracker.com'),
        headers: options.headers,
        trackOpens: options.trackOpens || false,
        trackClicks: options.trackClicks || false,
      };

      // Send email
      if (options.sendAt && options.sendAt > new Date()) {
        // Schedule for later delivery
        await this.scheduleEmail(emailData, options.sendAt);
        deliveryStatus.status = 'scheduled';
      } else {
        // Send immediately
        await this.sendEmailImmediately(emailData);
        deliveryStatus.status = 'sent';
        deliveryStatus.sentAt = new Date();
      }

      deliveryStatus.updatedAt = new Date();
      
      this.logger.log(`Email sent successfully: ${messageId} to ${deliveryStatus.to}`);
      
      return {
        messageId,
        status: deliveryStatus.status,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw new HttpException(
        `Failed to send email: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendBulkEmails(
    emails: EmailOptions[],
    options?: {
      batchSize?: number;
      delayBetweenBatches?: number;
    },
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    results: Array<{
      email: EmailOptions;
      messageId?: string;
      status: string;
      error?: string;
    }>;
  }> {
    const batchSize = options?.batchSize || 100;
    const delayBetweenBatches = options?.delayBetweenBatches || 1000;
    
    const results = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(email => this.sendEmail(email))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push({
            email: batch[batchResults.indexOf(result)],
            messageId: result.value.messageId,
            status: result.value.status,
          });
          sent++;
        } else {
          results.push({
            email: batch[batchResults.indexOf(result)],
            status: 'failed',
            error: result.reason?.message,
          });
          failed++;
        }
      }

      // Add delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    this.logger.log(`Bulk email sent: ${sent} sent, ${failed} failed out of ${emails.length}`);

    return {
      total: emails.length,
      sent,
      failed,
      results,
    };
  }

  async createTemplate(
    name: string,
    subject: string,
    htmlContent: string,
    textContent: string,
    variables: string[] = [],
  ): Promise<EmailTemplate> {
    const template: EmailTemplate = {
      id: this.generateId(),
      name,
      subject,
      htmlContent,
      textContent,
      variables,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);
    this.logger.log(`Email template created: ${name}`);

    return template;
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    const existingTemplate = this.templates.get(templateId);
    if (!existingTemplate) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    const updatedTemplate: EmailTemplate = {
      ...existingTemplate,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updatedTemplate);
    this.logger.log(`Email template updated: ${updatedTemplate.name}`);

    return updatedTemplate;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    this.templates.delete(templateId);
    this.logger.log(`Email template deleted: ${template.name}`);
  }

  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async getTemplates(filter?: {
    isActive?: boolean;
    search?: string;
  }): Promise<EmailTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (filter) {
      if (filter.isActive !== undefined) {
        templates = templates.filter(t => t.isActive === filter.isActive);
      }
      if (filter.search) {
        const search = filter.search.toLowerCase();
        templates = templates.filter(t => 
          t.name.toLowerCase().includes(search) ||
          t.subject.toLowerCase().includes(search)
        );
      }
    }

    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getDeliveryStatus(messageId: string): Promise<EmailDeliveryStatus | null> {
    return this.deliveryStatus.get(messageId) || null;
  }

  async getDeliveryStats(filter?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<EmailStats> {
    let statuses = Array.from(this.deliveryStatus.values());

    if (filter) {
      if (filter.startDate) {
        statuses = statuses.filter(s => s.createdAt >= filter.startDate!);
      }
      if (filter.endDate) {
        statuses = statuses.filter(s => s.createdAt <= filter.endDate!);
      }
      if (filter.status) {
        statuses = statuses.filter(s => s.status === filter.status);
      }
    }

    const totalSent = statuses.length;
    const totalDelivered = statuses.filter(s => s.status === 'delivered').length;
    const totalBounced = statuses.filter(s => s.status === 'bounced').length;
    const totalFailed = statuses.filter(s => s.status === 'failed').length;
    
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
    
    const totalOpens = statuses.reduce((sum, s) => sum + s.opens, 0);
    const totalClicks = statuses.reduce((sum, s) => sum + s.clicks, 0);
    
    const averageOpenRate = totalDelivered > 0 ? (totalOpens / totalDelivered) * 100 : 0;
    const averageClickRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0;

    const topOpens = statuses
      .sort((a, b) => b.opens - a.opens)
      .slice(0, 10)
      .map(s => ({ email: s.to, opens: s.opens }));

    const topClicks = statuses
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)
      .map(s => ({ email: s.to, clicks: s.clicks }));

    return {
      totalSent,
      totalDelivered,
      totalBounced,
      totalFailed,
      deliveryRate,
      bounceRate,
      averageOpenRate,
      averageClickRate,
      topOpens,
      topClicks,
    };
  }

  async trackEmailOpen(messageId: string): Promise<void> {
    const status = this.deliveryStatus.get(messageId);
    if (status) {
      status.opens++;
      status.lastOpenedAt = new Date();
      status.updatedAt = new Date();
      
      this.logger.log(`Email opened: ${messageId}`);
    }
  }

  async trackEmailClick(messageId: string, link: string): Promise<void> {
    const status = this.deliveryStatus.get(messageId);
    if (status) {
      status.clicks++;
      status.lastClickedAt = new Date();
      status.updatedAt = new Date();
      
      this.logger.log(`Email link clicked: ${messageId} - ${link}`);
    }
  }

  async sendWelcomeEmail(to: string, userName: string, userId: string): Promise<void> {
    await this.sendEmail({
      to,
      template: 'welcome',
      templateData: {
        userName,
        userId,
        loginUrl: `${this.configService.get('FRONTEND_URL')}/login`,
      },
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string, expiresAt: Date): Promise<void> {
    await this.sendEmail({
      to,
      template: 'password_reset',
      templateData: {
        resetToken,
        expiresAt: expiresAt.toISOString(),
        resetUrl: `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`,
      },
    });
  }

  async sendBudgetAlertEmail(to: string, budgetName: string, currentAmount: number, budgetAmount: number): Promise<void> {
    await this.sendEmail({
      to,
      template: 'budget_alert',
      templateData: {
        budgetName,
        currentAmount,
        budgetAmount,
        percentage: (currentAmount / budgetAmount) * 100,
        dashboardUrl: `${this.configService.get('FRONTEND_URL')}/dashboard`,
      },
      priority: 'high',
    });
  }

  async sendGoalAchievedEmail(to: string, goalName: string, targetAmount: number, achievedAmount: number): Promise<void> {
    await this.sendEmail({
      to,
      template: 'goal_achieved',
      templateData: {
        goalName,
        targetAmount,
        achievedAmount,
        dashboardUrl: `${this.configService.get('FRONTEND_URL')}/goals`,
      },
    });
  }

  async sendMonthlyReportEmail(to: string, month: string, year: number, reportData: any): Promise<void> {
    await this.sendEmail({
      to,
      template: 'monthly_report',
      templateData: {
        month,
        year,
        totalExpenses: reportData.totalExpenses,
        totalIncome: reportData.totalIncome,
        netSavings: reportData.netSavings,
        topCategories: reportData.topCategories,
        dashboardUrl: `${this.configService.get('FRONTEND_URL')}/reports`,
      },
      attachments: [
        {
          filename: `monthly_report_${month}_${year}.pdf`,
          content: reportData.pdfReport,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  async sendSubscriptionRenewalEmail(to: string, planName: string, renewalDate: Date, amount: number): Promise<void> {
    await this.sendEmail({
      to,
      template: 'subscription_renewal',
      templateData: {
        planName,
        renewalDate,
        amount,
        billingUrl: `${this.configService.get('FRONTEND_URL')}/billing`,
      },
      priority: 'high',
    });
  }

  async sendInvoiceEmail(to: string, invoiceData: any): Promise<void> {
    await this.sendEmail({
      to,
      template: 'invoice',
      templateData: {
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.amount,
        dueDate: invoiceData.dueDate,
        items: invoiceData.items,
        billingUrl: `${this.configService.get('FRONTEND_URL')}/billing`,
      },
      attachments: [
        {
          filename: `invoice_${invoiceData.invoiceNumber}.pdf`,
          content: invoiceData.pdfInvoice,
          contentType: 'application/pdf',
        },
      ],
      priority: 'high',
    });
  }

  private async sendEmailImmediately(emailData: any): Promise<void> {
    // In a real implementation, use email service like SendGrid, AWS SES, or SMTP
    this.logger.log(`Sending email immediately: ${emailData.messageId}`);
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async scheduleEmail(emailData: any, sendAt: Date): Promise<void> {
    // In a real implementation, use job queue or cron
    this.logger.log(`Scheduling email for ${sendAt.toISOString()}: ${emailData.messageId}`);
    
    // Mock implementation
    const delay = sendAt.getTime() - Date.now();
    setTimeout(() => {
      this.sendEmailImmediately(emailData);
    }, delay);
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let processedTemplate = template;
    
    for (const [key, value] of Object.entries(data)) {
      processedTemplate = processedTemplate.replace(
        new RegExp(`{{\\s*${key}\\s*}}`, 'g'),
        String(value)
      );
    }
    
    return processedTemplate;
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@expensetracker.com`;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private initializeDefaultTemplates(): void {
    // Welcome Email Template
    this.createTemplate(
      'welcome',
      'Welcome to Expense Tracker!',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Welcome to Expense Tracker, {{userName}}!</h2>
          <p>Thank you for joining Expense Tracker. We're excited to help you manage your finances better.</p>
          <p>Your account has been successfully created. You can now start tracking your expenses and managing your budget.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{loginUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Get Started</a>
          </div>
          <p style="color: #666; font-size: 12px;">If you have any questions, please contact our support team.</p>
        </div>
      `,
      'Welcome to Expense Tracker, {{userName}}!\n\nThank you for joining Expense Tracker. We\'re excited to help you manage your finances better.\n\nYour account has been successfully created. You can now start tracking your expenses and managing your budget.\n\nGet started: {{loginUrl}}\n\nIf you have any questions, please contact our support team.',
      ['userName', 'loginUrl'],
    );

    // Password Reset Template
    this.createTemplate(
      'password_reset',
      'Password Reset Request',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p style="color: #666; font-size: 12px;">If you didn't request this password reset, please ignore this email.</p>
        </div>
      `,
      'Password Reset Request\n\nYou requested to reset your password. Click the link below to reset your password:\n\n{{resetUrl}}\n\nThis link will expire in 1 hour.\n\nIf you didn\'t request this password reset, please ignore this email.',
      ['resetUrl', 'expiresAt'],
    );

    // Budget Alert Template
    this.createTemplate(
      'budget_alert',
      'Budget Alert: {{budgetName}}',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc3545;">Budget Alert: {{budgetName}}</h2>
          <p>You have exceeded your budget for <strong>{{budgetName}}</strong>.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Budget Amount:</strong> ${{budgetAmount}}</p>
            <p><strong>Current Spending:</strong> ${{currentAmount}}</p>
            <p><strong>Percentage Used:</strong> {{percentage}}%</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Dashboard</a>
          </div>
        </div>
      `,
      'Budget Alert: {{budgetName}}\n\nYou have exceeded your budget for {{budgetName}}.\n\nBudget Amount: ${{budgetAmount}}\nCurrent Spending: ${{currentAmount}}\nPercentage Used: {{percentage}}%\n\nView Dashboard: {{dashboardUrl}}',
      ['budgetName', 'budgetAmount', 'currentAmount', 'percentage', 'dashboardUrl'],
    );

    // Goal Achieved Template
    this.createTemplate(
      'goal_achieved',
      'Congratulations! Goal Achieved!',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">Congratulations! 🎉</h2>
          <p>You have successfully achieved your goal: <strong>{{goalName}}</strong>!</p>
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Target Amount:</strong> ${{targetAmount}}</p>
            <p><strong>Achieved Amount:</strong> ${{achievedAmount}}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Goals</a>
          </div>
        </div>
      `,
      'Congratulations! Goal Achieved!\n\nYou have successfully achieved your goal: {{goalName}}!\n\nTarget Amount: ${{targetAmount}}\nAchieved Amount: ${{achievedAmount}}\n\nView Goals: {{dashboardUrl}}',
      ['goalName', 'targetAmount', 'achievedAmount', 'dashboardUrl'],
    );

    // Monthly Report Template
    this.createTemplate(
      'monthly_report',
      'Your Monthly Expense Report',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Monthly Expense Report - {{month}} {{year}}</h2>
          <p>Here's your expense summary for {{month}} {{year}}:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Total Expenses:</strong> ${{totalExpenses}}</p>
            <p><strong>Total Income:</strong> ${{totalIncome}}</p>
            <p><strong>Net Savings:</strong> ${{netSavings}}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Dashboard</a>
          </div>
        </div>
      `,
      'Monthly Expense Report - {{month}} {{year}}\n\nHere's your expense summary for {{month}} {{year}}:\n\nTotal Expenses: ${{totalExpenses}}\nTotal Income: ${{totalIncome}}\nNet Savings: ${{netSavings}}\n\nView Dashboard: {{dashboardUrl}}',
      ['month', 'year', 'totalExpenses', 'totalIncome', 'netSavings', 'dashboardUrl'],
    );

    // Subscription Renewal Template
    this.createTemplate(
      'subscription_renewal',
      'Subscription Renewal Reminder',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ffc107;">Subscription Renewal Reminder</h2>
          <p>Your subscription to <strong>{{planName}}</strong> will be renewed on {{renewalDate}}.</p>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Plan:</strong> {{planName}}</p>
            <p><strong>Renewal Date:</strong> {{renewalDate}}</p>
            <p><strong>Amount:</strong> ${{amount}}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{billingUrl}}" style="background-color: #ffc107; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Manage Subscription</a>
          </div>
        </div>
      `,
      'Subscription Renewal Reminder\n\nYour subscription to {{planName}} will be renewed on {{renewalDate}}.\n\nPlan: {{planName}}\nRenewal Date: {{renewalDate}}\nAmount: ${{amount}}\n\nManage Subscription: {{billingUrl}}',
      ['planName', 'renewalDate', 'amount', 'billingUrl'],
    );

    // Invoice Template
    this.createTemplate(
      'invoice',
      'Invoice #{{invoiceNumber}}',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Invoice #{{invoiceNumber}}</h2>
          <p>Thank you for your business. Please find your invoice details below:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
            <p><strong>Due Date:</strong> {{dueDate}}</p>
            <p><strong>Amount:</strong> ${{amount}}</p>
          </div>
          <div style="margin: 20px 0;">
            <h3>Items:</h3>
            {{#items}}
            <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
              <p><strong>{{name}}</strong> - ${{amount}} x {{quantity}}</p>
            </div>
            {{/items}}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{billingUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Pay Invoice</a>
          </div>
        </div>
      `,
      'Invoice #{{invoiceNumber}}\n\nThank you for your business. Please find your invoice details below:\n\nInvoice Number: {{invoiceNumber}}\nDue Date: {{dueDate}}\nAmount: ${{amount}}\n\nItems:\n{{#items}}\n{{name}} - ${{amount}} x {{quantity}}\n{{/items}}\n\nPay Invoice: {{billingUrl}}',
      ['invoiceNumber', 'dueDate', 'amount', 'items', 'billingUrl'],
    );

    this.logger.log('Default email templates initialized');
  }
}
