import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SchedulerService {
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateRecurringExpenses() {
    console.log('Generating recurring expenses...');
    // Logic to create expenses from recurring templates
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkBudgetAlerts() {
    console.log('Checking budget alerts...');
    // Logic to check if budgets are exceeded
  }

  @Cron('0 0 1 * *') // First day of month
  async sendMonthlyReports() {
    console.log('Sending monthly reports...');
    // Logic to send monthly financial reports
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshCurrencyRates() {
    console.log('Refreshing currency rates...');
    // Logic to update exchange rates
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async checkGoalProgress() {
    console.log('Checking savings goal progress...');
    // Logic to check and notify about goal milestones
  }
}
