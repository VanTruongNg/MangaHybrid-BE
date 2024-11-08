import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('Client đã kết nối:', client.id);
    client.emit('connected', 'Xin chào! Bạn đã kết nối thành công!');
  }

  handleDisconnect(client: Socket) {
    console.log('Client đã ngắt kết nối:', client.id);
  }

  @SubscribeMessage('testMessage')
  handleMessage(@MessageBody() message: string): void {
    console.log('Tin nhắn nhận được:', message);
    this.server.emit('responseMessage', `Server nhận được tin nhắn: ${message}`);
  }

  @SubscribeMessage('ping')
  handlePing(): void {
    this.server.emit('pong', 'Pong!');
  }
}