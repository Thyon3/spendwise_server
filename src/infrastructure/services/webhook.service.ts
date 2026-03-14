import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  userId: string;
  signature?: string;
  id?: string;
}

export interface WebhookConfig {
  id: string;
  userId: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  retryCount: number;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  payload: WebhookPayload;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  response?: string;
  statusCode?: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly deliveryQueue = new Map<string, WebhookDelivery>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  async registerWebhook(
    userId: string,
    url: string,
    events: string[],
    options?: {
      secret?: string;
      retryCount?: number;
    },
  ): Promise<WebhookConfig> {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new HttpException('Invalid webhook URL', HttpStatus.BAD_REQUEST);
    }

    // Validate events
    const validEvents = this.getValidEvents();
    const invalidEvents = events.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      throw new HttpException(
        `Invalid events: ${invalidEvents.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check for duplicate webhook
    const existingWebhook = await this.findWebhookByUrl(userId, url);
    if (existingWebhook) {
      throw new HttpException('Webhook with this URL already exists', HttpStatus.CONFLICT);
    }

    // Generate secret if not provided
    const secret = options?.secret || this.generateSecret();

    // Create webhook configuration
    const webhookConfig: WebhookConfig = {
      id: this.generateId(),
      userId,
      url,
      events,
      secret,
      active: true,
      retryCount: options?.retryCount || 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // In a real implementation, save to database
    this.logger.log(`Registering webhook for user ${userId}: ${url}`);

    return webhookConfig;
  }

  async unregisterWebhook(userId: string, webhookId: string): Promise<void> {
    // In a real implementation, delete from database
    this.logger.log(`Unregistering webhook ${webhookId} for user ${userId}`);
  }

  async updateWebhook(
    webhookId: string,
    updates: Partial<WebhookConfig>,
  ): Promise<WebhookConfig> {
    // In a real implementation, update in database
    this.logger.log(`Updating webhook ${webhookId}`);

    // Return updated webhook
    const existingWebhook = await this.getWebhook(webhookId);
    return { ...existingWebhook, ...updates, updatedAt: new Date() };
  }

  async getWebhooks(userId: string): Promise<WebhookConfig[]> {
    // In a real implementation, fetch from database
    this.logger.log(`Fetching webhooks for user ${userId}`);
    return [];
  }

  async getWebhook(webhookId: string): Promise<WebhookConfig> {
    // In a real implementation, fetch from database
    this.logger.log(`Fetching webhook ${webhookId}`);

    // Return mock webhook
    return {
      id: webhookId,
      userId: 'mock-user',
      url: 'https://example.com/webhook',
      events: ['expense.created', 'budget.exceeded'],
      secret: 'mock-secret',
      active: true,
      retryCount: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async triggerWebhook(
    userId: string,
    event: string,
    data: any,
    options?: {
      immediate?: boolean;
      priority?: 'high' | 'normal' | 'low';
    },
  ): Promise<void> {
    const webhooks = await this.getWebhooks(userId);
    const relevantWebhooks = webhooks.filter(webhook =>
      webhook.active && webhook.events.includes(event)
    );

    for (const webhook of relevantWebhooks) {
      const payload: WebhookPayload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        userId,
        id: this.generateId(),
      };

      // Add signature if secret is configured
      if (webhook.secret) {
        payload.signature = this.generateSignature(payload, webhook.secret);
      }

      await this.queueWebhookDelivery(webhook, payload, options);
    }
  }

  async triggerWebhookByUrl(
    url: string,
    event: string,
    data: any,
    secret?: string,
  ): Promise<void> {
    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      userId: 'system',
      id: this.generateId(),
    };

    if (secret) {
      payload.signature = this.generateSignature(payload, secret);
    }

    await this.sendWebhook(url, payload);
  }

  private async queueWebhookDelivery(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    options?: {
      immediate?: boolean;
      priority?: 'high' | 'normal' | 'low';
    },
  ): Promise<void> {
    const delivery: WebhookDelivery = {
      id: this.generateId(),
      webhookId: webhook.id,
      payload,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.deliveryQueue.set(delivery.id, delivery);

    if (options?.immediate) {
      await this.processWebhookDelivery(delivery.id);
    } else {
      // Add to queue for background processing
      this.logger.log(`Queued webhook delivery ${delivery.id} for webhook ${webhook.id}`);
    }
  }

  async processWebhookDelivery(deliveryId: string): Promise<void> {
    const delivery = this.deliveryQueue.get(deliveryId);
    if (!delivery) {
      throw new HttpException('Webhook delivery not found', HttpStatus.NOT_FOUND);
    }

    const webhook = await this.getWebhook(delivery.webhookId);
    if (!webhook || !webhook.active) {
      delivery.status = 'failed';
      delivery.updatedAt = new Date();
      return;
    }

    delivery.status = 'retrying';
    delivery.attempts++;
    delivery.lastAttempt = new Date();
    delivery.updatedAt = new Date();

    try {
      const response = await this.sendWebhook(webhook.url, delivery.payload);
      delivery.status = 'delivered';
      delivery.response = response;
      delivery.statusCode = 200;
      delivery.updatedAt = new Date();

      this.logger.log(`Webhook delivered successfully: ${delivery.id}`);
    } catch (error) {
      delivery.statusCode = 500;
      delivery.response = error.message;

      if (delivery.attempts < webhook.retryCount) {
        // Schedule retry
        const retryDelay = this.calculateRetryDelay(delivery.attempts);
        delivery.nextRetry = new Date(Date.now() + retryDelay);
        delivery.status = 'pending';

        this.logger.log(`Webhook delivery failed, scheduling retry: ${delivery.id} in ${retryDelay}ms`);

        // In a real implementation, schedule retry with background job
        setTimeout(() => {
          this.processWebhookDelivery(deliveryId);
        }, retryDelay);
      } else {
        delivery.status = 'failed';
        this.logger.error(`Webhook delivery failed permanently: ${delivery.id}`);
      }

      delivery.updatedAt = new Date();
    }
  }

  private async sendWebhook(url: string, payload: WebhookPayload): Promise<string> {
    try {
      // In a real implementation, use axios or fetch to send HTTP POST
      this.logger.log(`Sending webhook to ${url}: ${payload.event}`);

      // Mock successful response
      return 'Webhook delivered successfully';
    } catch (error) {
      this.logger.error(`Failed to send webhook to ${url}:`, error);
      throw error;
    }
  }

  async getWebhookDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
    // In a real implementation, fetch from database
    return Array.from(this.deliveryQueue.values())
      .filter(delivery => delivery.webhookId === webhookId);
  }

  async getDeliveryStatus(deliveryId: string): Promise<WebhookDelivery | null> {
    return this.deliveryQueue.get(deliveryId) || null;
  }

  async retryWebhookDelivery(deliveryId: string): Promise<void> {
    const delivery = this.deliveryQueue.get(deliveryId);
    if (!delivery) {
      throw new HttpException('Webhook delivery not found', HttpStatus.NOT_FOUND);
    }

    if (delivery.status !== 'failed') {
      throw new HttpException('Webhook delivery cannot be retried', HttpStatus.BAD_REQUEST);
    }

    delivery.status = 'pending';
    delivery.attempts = 0;
    delivery.nextRetry = undefined;
    delivery.updatedAt = new Date();

    await this.processWebhookDelivery(deliveryId);
  }

  async testWebhook(webhookId: string): Promise<{
    success: boolean;
    response?: string;
    error?: string;
  }> {
    const webhook = await this.getWebhook(webhookId);
    if (!webhook) {
      throw new HttpException('Webhook not found', HttpStatus.NOT_FOUND);
    }

    const testPayload: WebhookPayload = {
      event: 'webhook.test',
      data: { message: 'This is a test webhook' },
      timestamp: new Date().toISOString(),
      userId: webhook.userId,
      id: this.generateId(),
    };

    try {
      const response = await this.sendWebhook(webhook.url, testPayload);
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async validateWebhookSignature(
    payload: WebhookPayload,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    const expectedSignature = this.generateSignature(payload, secret);
    return signature === expectedSignature;
  }

  private async findWebhookByUrl(userId: string, url: string): Promise<WebhookConfig | null> {
    // In a real implementation, check database
    return null;
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private getValidEvents(): string[] {
    return [
      'expense.created',
      'expense.updated',
      'expense.deleted',
      'budget.created',
      'budget.updated',
      'budget.exceeded',
      'goal.created',
      'goal.updated',
      'goal.achieved',
      'category.created',
      'category.updated',
      'category.deleted',
      'user.registered',
      'user.updated',
      'subscription.created',
      'subscription.updated',
      'subscription.cancelled',
      'payment.processed',
      'payment.failed',
      'notification.sent',
      'report.generated',
      'backup.created',
      'export.completed',
    ];
  }

  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateSignature(payload: WebhookPayload, secret: string): string {
    // In a real implementation, use HMAC-SHA256
    const payloadString = JSON.stringify(payload);
    return Buffer.from(payloadString + secret).toString('base64');
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 300000; // 5 minutes
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  // Event handlers
  async onExpenseCreated(userId: string, expense: any): Promise<void> {
    await this.triggerWebhook(userId, 'expense.created', expense);
  }

  async onExpenseUpdated(userId: string, expense: any): Promise<void> {
    await this.triggerWebhook(userId, 'expense.updated', expense);
  }

  async onExpenseDeleted(userId: string, expense: any): Promise<void> {
    await this.triggerWebhook(userId, 'expense.deleted', expense);
  }

  async onBudgetExceeded(userId: string, budget: any): Promise<void> {
    await this.triggerWebhook(userId, 'budget.exceeded', budget);
  }

  async onGoalAchieved(userId: string, goal: any): Promise<void> {
    await this.triggerWebhook(userId, 'goal.achieved', goal);
  }

  async onUserRegistered(userId: string, user: any): Promise<void> {
    await this.triggerWebhook(userId, 'user.registered', user);
  }

  async onPaymentProcessed(userId: string, payment: any): Promise<void> {
    await this.triggerWebhook(userId, 'payment.processed', payment);
  }

  async onPaymentFailed(userId: string, payment: any): Promise<void> {
    await this.triggerWebhook(userId, 'payment.failed', payment);
  }

  async onNotificationSent(userId: string, notification: any): Promise<void> {
    await this.triggerWebhook(userId, 'notification.sent', notification);
  }

  async onReportGenerated(userId: string, report: any): Promise<void> {
    await this.triggerWebhook(userId, 'report.generated', report);
  }

  async onBackupCreated(userId: string, backup: any): Promise<void> {
    await this.triggerWebhook(userId, 'backup.created', backup);
  }

  async onExportCompleted(userId: string, export : any): Promise<void> {
    await this.triggerWebhook(userId, 'export.completed', export );
  }

  async getWebhookStats(userId: string): Promise<{
    totalWebhooks: number;
    activeWebhooks: number;
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageDeliveryTime: number;
    topEvents: Array<{
      event: string;
      count: number;
    }>;
  }> {
    // In a real implementation, calculate from database
    return {
      totalWebhooks: 0,
      activeWebhooks: 0,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageDeliveryTime: 0,
      topEvents: [],
    };
  }

  async cleanupExpiredDeliveries(): Promise<void> {
    const now = Date.now();
    const expiredTime = now - (7 * 24 * 60 * 60 * 1000); // 7 days ago

    for (const [id, delivery] of this.deliveryQueue.entries()) {
      if (delivery.createdAt.getTime() < expiredTime) {
        this.deliveryQueue.delete(id);
      }
    }
  }
}
