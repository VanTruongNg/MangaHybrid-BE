import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from 'src/auth/guards/ws-auth.guard';
import { ChatRoomService } from 'src/chat-room/chat-room.service';
import { NotificationResponse } from 'src/notification/interface/notification.res';

@WebSocketGateway()
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, string>();

  constructor(
    private wsAuthGuard: WsAuthGuard,
    private chatRoomService: ChatRoomService
  ) {}

  async handleConnection(client: Socket) {
    try {
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
        
        const publicRoomId = this.chatRoomService.getPublicRoomId();
        await client.join(publicRoomId);
        await this.chatRoomService.addParticipant(userId);
        
        const messages = this.chatRoomService.getPublicMessage();
        client.emit('previousMessages', messages);
        
        console.log(`User ${userId} connected and joined public room`);
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
      this.chatRoomService.removeParticipant(userId);
      console.log(`User ${userId} disconnected`);
    }
  }

  isUserOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }

  sendNotificationToUser(userId: string, notification: NotificationResponse) {
    this.server.to(userId).emit('notification', notification);
  }

  @SubscribeMessage('sendPublicMessage')
  async handlePublicMessage(client: Socket, content: string) {
    try {
      const message = await this.chatRoomService.addPublicMessage(
        client.data.userId,
        content
      );
      
      const roomId = this.chatRoomService.getPublicRoomId();
      this.server.to(roomId).emit('newMessage', message);
    } catch (error) {
      client.emit('error', { message: 'Không thể gửi tin nhắn' });
    }
  }
}