import { Controller, Get, Put, Delete, Param, Query, Request } from '@nestjs/common';

@Controller('notifications')
export class NotificationController {
  @Get()
  async findAll(@Request() req, @Query('unreadOnly') unreadOnly?: string) {
    return { message: 'Get all notifications', unreadOnly: unreadOnly === 'true' };
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return { count: 0 };
  }

  @Put(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    return { message: `Mark notification ${id} as read` };
  }

  @Put('read-all')
  async markAllAsRead(@Request() req) {
    return { message: 'Mark all notifications as read' };
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    return { message: `Delete notification ${id}` };
  }
}
