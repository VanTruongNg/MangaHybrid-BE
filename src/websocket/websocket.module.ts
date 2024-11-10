import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    AuthModule
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway]
})
export class WebsocketModule {}
