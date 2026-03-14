import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from '../../../application/services/notification.service';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly connectedClients = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
  ) { }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new WsException('Unauthorized');
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // Store the connection
      this.connectedClients.set(userId, client.id);
      client.data.userId = userId;

      this.logger.log(`Client connected: ${client.id} for user: ${userId}`);

      // Send welcome notification
      client.emit('connected', { message: 'Connected to notifications' });

      // Join user to their personal room
      await client.join(`user:${userId}`);

      // Send any pending notifications
      const pendingNotifications = await this.notificationService.getPendingNotifications(userId);
      if (pendingNotifications.length > 0) {
        client.emit('notifications', pendingNotifications);
      }
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedClients.delete(userId);
      this.logger.log(`Client disconnected: ${client.id} for user: ${userId}`);
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { notificationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    await this.notificationService.markAsRead(userId, data.notificationId);

    client.emit('notificationRead', { notificationId: data.notificationId });
  }

  @SubscribeMessage('subscribeToCategories')
  async handleSubscribeToCategories(
    @MessageBody() data: { categories: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;

    // Leave all category rooms first
    const rooms = Array.from(client.rooms).filter(room => room.startsWith('category:'));
    for (const room of rooms) {
      await client.leave(room);
    }

    // Join new category rooms
    for (const category of data.categories) {
      await client.join(`category:${category}`);
    }

    client.emit('subscribed', { categories: data.categories });
  }

  // Server-side methods to send notifications
  async sendNotificationToUser(userId: string, notification: any) {
    const socketId = this.connectedClients.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
    }
  }

  async sendNotificationToCategory(category: string, notification: any) {
    this.server.to(`category:${category}`).emit('notification', notification);
  }

  async broadcastNotification(notification: any) {
    this.server.emit('notification', notification);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Also check query parameter for socket.io connections
    const token = client.handshake.query.token as string;
    return token || null;
  }
}
