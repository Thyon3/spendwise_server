import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
  async sendSms(phoneNumber: string, message: string): Promise<void> {
    console.log(`Sending SMS to ${phoneNumber}: ${message}`);
    // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
  }

  async sendBudgetAlertSms(phoneNumber: string, budgetName: string, percentage: number): Promise<void> {
    const message = `Budget Alert: Your ${budgetName} budget is at ${percentage}% capacity.`;
    await this.sendSms(phoneNumber, message);
  }

  async sendGoalAchievedSms(phoneNumber: string, goalName: string): Promise<void> {
    const message = `Congratulations! You've achieved your goal: ${goalName}`;
    await this.sendSms(phoneNumber, message);
  }

  async sendSubscriptionReminderSms(phoneNumber: string, subscriptionName: string, daysUntil: number): Promise<void> {
    const message = `Reminder: Your ${subscriptionName} subscription renews in ${daysUntil} days.`;
    await this.sendSms(phoneNumber, message);
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    const message = `Your verification code is: ${code}. Valid for 10 minutes.`;
    await this.sendSms(phoneNumber, message);
  }
}
