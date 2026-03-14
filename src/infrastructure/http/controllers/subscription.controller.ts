import { Controller, Get, Post, Put, Delete, Query, Request, UseGuards, HttpCode, HttpStatus, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SubscriptionService } from '../../../application/services/subscription.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create subscription', description: 'Create a new subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createSubscription(@Request() req, @Body() data: any) {
    return this.subscriptionService.createSubscription(req.user.userId, data);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update subscription', description: 'Update an existing subscription' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async updateSubscription(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.subscriptionService.updateSubscription(req.user.userId, id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete subscription', description: 'Delete a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async deleteSubscription(@Request() req, @Param('id') id: string) {
    return this.subscriptionService.deleteSubscription(req.user.userId, id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user subscriptions', description: 'Get all subscriptions for the user' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({ name: 'upcoming', required: false, type: Boolean, description: 'Show upcoming renewals (next 7 days)' })
  async getUserSubscriptions(@Request() req, @Query() query: any) {
    return this.subscriptionService.getUserSubscriptions(req.user.userId, query);
  }

  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get subscription analytics', description: 'Get comprehensive subscription analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubscriptionAnalytics(@Request() req) {
    return this.subscriptionService.getSubscriptionAnalytics(req.user.userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription', description: 'Cancel a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancelSubscription(@Request() req, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.subscriptionService.cancelSubscription(req.user.userId, id, body.reason);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause subscription', description: 'Pause a subscription temporarily' })
  @ApiResponse({ status: 200, description: 'Subscription paused successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async pauseSubscription(@Request() req, @Param('id') id: string, @Body() body: { pauseUntil?: Date }) {
    return this.subscriptionService.pauseSubscription(req.user.userId, id, body.pauseUntil);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume subscription', description: 'Resume a paused subscription' })
  @ApiResponse({ status: 200, description: 'Subscription resumed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async resumeSubscription(@Request() req, @Param('id') id: string) {
    return this.subscriptionService.resumeSubscription(req.user.userId, id);
  }

  @Post(':id/process-billing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process subscription billing', description: 'Manually process subscription billing' })
  @ApiResponse({ status: 200, description: 'Billing processed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async processSubscriptionBilling(@Request() req, @Param('id') id: string) {
    await this.subscriptionService.processSubscriptionBilling(id);
    return { message: 'Billing processed successfully' };
  }
}
