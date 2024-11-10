import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from 'src/auth/guards/ws-auth.guard';
import { NotificationResponse } from 'src/notification/interface/notification.res';

@WebSocketGateway()
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, string>();

  constructor(private wsAuthGuard: WsAuthGuard) {}

  async handleConnection(client: Socket) {
    try {
      // Thực hiện xác thực khi client kết nối
      const isAuthenticated = await this.wsAuthGuard.canActivate({
        switchToWs: () => ({ getClient: () => client })
      } as any);

      if (!isAuthenticated) {
        client.disconnect();
        return;
      }

      const userId = client.data.userId;
      if (userId) {
        this.userSocketMap.set(userId, client.id);
        client.join(userId);
        console.log(`User ${userId} connected`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Array.from(this.userSocketMap.entries())
      .find(([_, socketId]) => socketId === client.id)?.[0];
    
    if (userId) {
      this.userSocketMap.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  }

  isUserOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }

  sendNotificationToUser(userId: string, notification: NotificationResponse) {
    this.server.to(userId).emit('notification', notification);
  }
}