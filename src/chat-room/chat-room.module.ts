import { forwardRef, Module } from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { ChatRoomSchema } from './schema/chat-room.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageSchema } from './schema/message.schema';
import { WebsocketModule } from 'src/websocket/websocket.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "ChatRoom", schema: ChatRoomSchema }]),
    MongooseModule.forFeature([{ name: "Message", schema: MessageSchema }]),
    forwardRef(() => WebsocketModule),
    AuthModule
  ],
  providers: [ChatRoomService],
  exports: [ChatRoomService, MongooseModule]
})
export class ChatRoomModule {}
