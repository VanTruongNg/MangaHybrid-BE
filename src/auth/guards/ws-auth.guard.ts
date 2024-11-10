import { Injectable } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { WsStrategy } from '../strategies/ws.strategy';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private wsStrategy: WsStrategy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    return this.wsStrategy.validateClient(client);
  }
}