import { Inject } from '@nestjs/common';
import { forwardRef } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from 'src/auth/guards/ws-auth.guard';
import { ChatRoomService } from 'src/chat-room/chat-room.service';
import { NotificationResponse } from 'src/notification/interface/notification.res';
import { NotificationService } from 'src/notification/notification.service';

@WebSocketGateway()
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, string>();

  constructor(
    private wsAuthGuard: WsAuthGuard,
    private chatRoomService: ChatRoomService,
    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService
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
      if (!userId) {
        client.disconnect();
        return;
      }

      this.userSocketMap.set(userId, client.id);

      client.join(userId);
      const [publicRoomId, messages, unreadNotifications] = await Promise.all([
        (async () => {
          const roomId = this.chatRoomService.getPublicRoomId();
          await client.join(roomId);
          await this.chatRoomService.addParticipant(userId);
          return roomId;
        })(),
        
        this.chatRoomService.getPublicMessage(),
        
        this.notificationService.getUnreadNotifications(userId)
      ]);
  
      client.emit('previousMessages', messages);
      client.emit('unreadNotifications', unreadNotifications);
  
      console.log(`User ${userId} connected and joined public room ${publicRoomId}`);
  
    } catch (error) {
      if (client.connected) {
        client.emit('error', { message: 'Có lỗi khi kết nối' });
        client.disconnect();
      }
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
  async handlePublicMessage(client: Socket, payload: {content: string, tempId: string}) {
    try {
      if (!payload.content?.trim()) {
        return client.emit('messageError', {
          tempId: payload.tempId,
          error: 'CHAT_ROOM.EMPTY_MESSAGE'
        });
      }

      const message = await this.chatRoomService.addPublicMessage(
        client.data.userId,
        payload.content
      );

      client.emit('messageAck', {
        tempId: payload.tempId,
        message: message
      });
      
      const roomId = this.chatRoomService.getPublicRoomId();
      client.broadcast.to(roomId).emit('newMessage', message);

    } catch (error) {
      client.emit('messageError', {
        tempId: payload.tempId,
        error: error.message || 'CHAT_ROOM.SEND_FAILED'
      });
    }
  }
}