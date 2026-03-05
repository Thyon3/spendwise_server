import { Injectable } from '@nestjs/common';

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  userId: string;
}

@Injectable()
export class WebhookService {
  private webhooks: Map<string, string[]> = new Map();

  async registerWebhook(userId: string, url: string, events: string[]): Promise<void> {
    console.log(`Registering webhook for user ${userId}: ${url}`);
    // TODO: Store webhook configuration in database
    this.webhooks.set(userId, [...(this.webhooks.get(userId) || []), url]);
  }

  async unregisterWebhook(userId: string, url: string): Promise<void> {
    console.log(`Unregistering webhook for user ${userId}: ${url}`);
    const urls = this.webhooks.get(userId) || [];
    this.webhooks.set(
      userId,
      urls.filter((u) => u !== url),
    );
  }

  async triggerWebhook(userId: string, event: string, data: any): Promise<void> {
    const urls = this.webhooks.get(userId) || [];
    
    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      userId,
    };

    for (const url of urls) {
      await this.sendWebhook(url, payload);
    }
  }

  private async sendWebhook(url: string, payload: WebhookPayload): Promise<void> {
    try {
      console.log(`Sending webhook to ${url}:`, payload.event);
      // TODO: Implement HTTP POST request with retry logic
      // Use axios or fetch to send the webhook
    } catch (error) {
      console.error(`Failed to send webhook to ${url}:`, error);
    }
  }

  async onExpenseCreated(userId: string, expense: any): Promise<void> {
    await this.triggerWebhook(userId, 'expense.created', expense);
  }

  async onBudgetExceeded(userId: string, budget: any): Promise<void> {
    await this.triggerWebhook(userId, 'budget.exceeded', budget);
  }

  async onGoalAchieved(userId: string, goal: any): Promise<void> {
    await this.triggerWebhook(userId, 'goal.achieved', goal);
  }
}
