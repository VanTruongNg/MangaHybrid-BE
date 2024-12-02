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
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
    }
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

  @SubscribeMessage('sendPrivateMessage') 
  async handlePrivateMessage(client: Socket, data: any) {
    try {
      const roomId = data.roomId;
      const content = data.content;
      const tempId = data.tempId;

      if (!content?.trim()) {
        return client.emit('messageError', {
          tempId,
          error: 'Message content cannot be empty'
        });
      }

      const message = await this.chatRoomService.addPrivateMessage(
        roomId,
        client.data.userId,
        content
      );

      client.emit('messageAck', {
        tempId,
        message
      });

      const room = await this.chatRoomService.getPrivateRoom(roomId, client.data.userId);
      
      const otherParticipants = (room.participants as any[])
        .filter(p => p._id?.toString() !== client.data.userId);
        
      otherParticipants.forEach(participant => {
        const receiverSocketId = this.userSocketMap.get(participant._id.toString());
        if (receiverSocketId) {
          const receiverSocket = this.server.sockets.sockets.get(receiverSocketId);
          const isInRoom = receiverSocket?.rooms?.has(roomId);

          if (isInRoom) {
            client.broadcast.to(roomId).emit('newPrivateMessage', message);
          } else {
            this.server.to(receiverSocketId).emit('newPrivateMessage', message);
          }
        }
      });

    } catch (error) {
      console.error('Error sending message:', error);
      client.emit('messageError', {
        tempId: data.tempId,
        error: error.message || 'Failed to send message'
      });
    }
  }

  @SubscribeMessage('openPrivateRoom')
  async handleOpenPrivateRoom(client: Socket, data: any) {
    try {
      const roomId = data.roomId;
      
      await this.chatRoomService.getPrivateRoom(roomId, client.data.userId);
      
      client.join(roomId);
      
      const messages = await this.chatRoomService.getPrivateMessages(roomId, client.data.userId);
      
      client.emit('openedPrivateRoom', {
        roomId,
        messages
      });

    } catch (error) {
      console.error('Error opening room:', error);
      client.emit('error', {
        message: error.message || 'Failed to open private room'
      });
    }
  }

  @SubscribeMessage('markMessageRead')
  async handleMarkMessageRead(client: Socket, messageId: string) {
    try {
      await this.chatRoomService.markMessageAsRead(messageId, client.data.userId);
    } catch (error) {
      client.emit('error', {
        message: error.message || 'Failed to mark message as read'
      });
    } 
  }

  @SubscribeMessage('leavePrivateRoom')
  async handleLeavePrivateRoom(client: Socket, data: any) {
    try {
      const roomId = data.roomId;
      
      client.leave(roomId);
      
      client.emit('leftPrivateRoom', {
        roomId
      });

    } catch (error) {
      console.error('Error leaving room:', error);
      client.emit('error', {
        message: error.message || 'Failed to leave private room'
      });
    }
  }
}