import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { ChatRoomModule } from 'src/chat-room/chat-room.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    ChatRoomModule,
    AuthModule,
    NotificationModule
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway]
})
export class WebsocketModule {}
