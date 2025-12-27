import { Controller, Get, Put, Delete, Param, Query, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PrismaNotificationRepository } from '../../../infrastructure/persistence/prisma/prisma-notification.repository';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly repo: PrismaNotificationRepository) { }

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async findAll(@Request() req: any, @Query('unreadOnly') unreadOnly?: string) {
    return this.repo.findAll(req.user.userId, unreadOnly === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.repo.getUnreadCount(req.user.userId);
    return { count };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    await this.repo.markAsRead(id, req.user.userId);
    return { success: true };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req: any) {
    await this.repo.markAllAsRead(req.user.userId);
    return { success: true };
  }

  @Delete('clear-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all read notifications' })
  async clearRead(@Request() req: any) {
    await this.repo.deleteAllRead(req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  async delete(@Request() req: any, @Param('id') id: string) {
    await this.repo.delete(id, req.user.userId);
  }
}
