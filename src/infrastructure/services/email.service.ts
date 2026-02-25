import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendBudgetAlert(userEmail: string, budgetName: string, percentage: number) {
    console.log(`Sending budget alert to ${userEmail}: ${budgetName} at ${percentage}%`);
  }

  async sendGoalAchieved(userEmail: string, goalName: string) {
    console.log(`Sending goal achieved email to ${userEmail}: ${goalName}`);
  }

  async sendMonthlyReport(userEmail: string, reportData: any) {
    console.log(`Sending monthly report to ${userEmail}`);
  }

  async sendRecurringReminder(userEmail: string, expenseName: string, amount: number) {
    console.log(`Sending recurring reminder to ${userEmail}: ${expenseName} - ${amount}`);
  }

  async sendWelcomeEmail(userEmail: string, userName: string) {
    console.log(`Sending welcome email to ${userEmail}`);
  }
}
