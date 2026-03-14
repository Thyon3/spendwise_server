import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    path: string;
    contentType: string;
  }>;
}

export interface EmailTemplate {
  html: string;
  text: string;
  subject: string;
}

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) { }

  async sendBudgetAlert(userEmail: string, budgetName: string, percentage: number) {
    const template = this.getBudgetAlertTemplate(budgetName, percentage);
    await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      template: 'budget-alert',
      data: { budgetName, percentage },
    });
  }

  async sendGoalAchieved(userEmail: string, goalName: string) {
    const template = this.getGoalAchievedTemplate(goalName);
    await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      template: 'goal-achieved',
      data: { goalName },
    });
  }

  async sendMonthlyReport(userEmail: string, reportData: any) {
    const template = this.getMonthlyReportTemplate(reportData);
    await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      template: 'monthly-report',
      data: reportData,
    });
  }

  async sendRecurringReminder(userEmail: string, expenseName: string, amount: number) {
    const template = this.getRecurringReminderTemplate(expenseName, amount);
    await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      template: 'recurring-reminder',
      data: { expenseName, amount },
    });
  }

  async sendWelcomeEmail(userEmail: string, userName: string) {
    const template = this.getWelcomeTemplate(userName);
    await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      template: 'welcome',
      data: { userName },
    });
  }

  async sendPasswordReset(userEmail: string, resetToken: string) {
    const template = this.getPasswordResetTemplate(resetToken);
    await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      template: 'password-reset',
      data: { resetToken },
    });
  }

  async sendEmailVerification(userEmail: string, verificationToken: string) {
    const template = this.getEmailVerificationTemplate(verificationToken);
    await this.sendEmail({
      to: userEmail,
      subject: template.subject,
      template: 'email-verification',
      data: { verificationToken },
    });
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      // In a real implementation, you would use a service like SendGrid, Nodemailer, or AWS SES
      console.log(`Sending email to ${options.to} with subject: ${options.subject}`);

      // Mock email sending for demonstration
      const mockEmailService = this.configService.get<string>('EMAIL_SERVICE', 'mock');

      if (mockEmailService === 'mock') {
        console.log('Email sent successfully (mock service)');
        return;
      }

      // Real email sending logic would go here
      await this.sendRealEmail(options);
    } catch (error) {
      throw new HttpException(
        `Failed to send email: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async sendRealEmail(options: EmailOptions): Promise<void> {
    // Implementation would depend on the email service chosen
    // Example with SendGrid, Nodemailer, or AWS SES
    console.log('Real email sending implementation would go here');
  }

  private getBudgetAlertTemplate(budgetName: string, percentage: number): EmailTemplate {
    return {
      subject: `Budget Alert: ${budgetName} at ${percentage}%`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">Budget Alert</h2>
          <p>Your budget <strong>${budgetName}</strong> has reached <strong>${percentage}%</strong> of its limit.</p>
          <p>Please review your spending and consider adjusting your budget if needed.</p>
          <p>Best regards,<br>Expense Tracker Team</p>
        </div>
      `,
      text: `Budget Alert: ${budgetName} at ${percentage}%\n\nYour budget ${budgetName} has reached ${percentage}% of its limit.`,
    };
  }

  private getGoalAchievedTemplate(goalName: string): EmailTemplate {
    return {
      subject: `Congratulations! Goal Achieved: ${goalName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">Goal Achieved! 🎉</h2>
          <p>Congratulations! You have successfully achieved your goal: <strong>${goalName}</strong>.</p>
          <p>Your dedication and consistency have paid off. Keep up the great work!</p>
          <p>Best regards,<br>Expense Tracker Team</p>
        </div>
      `,
      text: `Congratulations! Goal Achieved: ${goalName}\n\nYou have successfully achieved your goal: ${goalName}.`,
    };
  }

  private getMonthlyReportTemplate(reportData: any): EmailTemplate {
    return {
      subject: 'Your Monthly Expense Report',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Monthly Expense Report</h2>
          <p>Here's your expense summary for this month:</p>
          <ul>
            <li>Total Expenses: $${reportData.totalExpenses}</li>
            <li>Total Income: $${reportData.totalIncome}</li>
            <li>Net Savings: $${reportData.netSavings}</li>
          </ul>
          <p>Best regards,<br>Expense Tracker Team</p>
        </div>
      `,
      text: `Monthly Expense Report\n\nTotal Expenses: $${reportData.totalExpenses}\nTotal Income: $${reportData.totalIncome}\nNet Savings: $${reportData.netSavings}`,
    };
  }

  private getRecurringReminderTemplate(expenseName: string, amount: number): EmailTemplate {
    return {
      subject: `Recurring Expense Reminder: ${expenseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Recurring Expense Reminder</h2>
          <p>This is a reminder about your recurring expense:</p>
          <p><strong>${expenseName}</strong> - $${amount}</p>
          <p>Please ensure you have sufficient funds for this payment.</p>
          <p>Best regards,<br>Expense Tracker Team</p>
        </div>
      `,
      text: `Recurring Expense Reminder: ${expenseName}\n\n${expenseName} - $${amount}`,
    };
  }

  private getWelcomeTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Welcome to Expense Tracker!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Expense Tracker! 👋</h2>
          <p>Hi ${userName},</p>
          <p>Welcome to Expense Tracker! We're excited to help you manage your finances better.</p>
          <p>Get started by adding your first expense and exploring our features.</p>
          <p>Best regards,<br>Expense Tracker Team</p>
        </div>
      `,
      text: `Welcome to Expense Tracker!\n\nHi ${userName},\n\nWelcome to Expense Tracker! We're excited to help you manage your finances better.`,
    };
  }

  private getPasswordResetTemplate(resetToken: string): EmailTemplate {
    return {
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <p><a href="${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>Expense Tracker Team</p>
        </div>
      `,
      text: `Password Reset\n\nReset your password here: ${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`,
    };
  }

  private getEmailVerificationTemplate(verificationToken: string): EmailTemplate {
    return {
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token=${verificationToken}">Verify Email</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <p>Best regards,<br>Expense Tracker Team</p>
        </div>
      `,
      text: `Email Verification\n\nVerify your email here: ${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token=${verificationToken}`,
    };
  }
}
