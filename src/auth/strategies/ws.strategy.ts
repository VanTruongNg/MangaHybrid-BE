import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { WsException } from '@nestjs/websockets';
import { Model } from 'mongoose';
import { Socket } from 'socket.io';
import { Token } from '../schemas/token.schema';
import { User } from '../schemas/user.schema';

@Injectable()
export class WsStrategy {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Token.name) private readonly tokenModel: Model<Token>
  ) {}

  async validateClient(client: Socket): Promise<boolean> {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      });

      if (payload.type) {
        throw new WsException('Token không hợp lệ');
      }

      const user = await this.userModel.findById(payload.id);
      if (!user) {
        throw new WsException('User không tồn tại');
      }

      const tokenDoc = await this.tokenModel.findOne({ user: user._id }).sort({ createdAt: -1 });
      if (tokenDoc?.isRevoked) {
        throw new WsException('Token đã bị vô hiệu hoá');
      }

      client.data.userId = user._id.toString();
      return true;
    } catch (err) {
      throw new WsException('Unauthorized');
    }
  }

  private extractToken(client: Socket): string {
    const token = 
      client.handshake.auth.token ||
      client.handshake.headers.authorization?.split(' ')[1] ||
      client.handshake.headers.cookie?.split('access_token=')[1];

    if (!token) {
      throw new WsException('Token không tìm thấy');
    }

    return token;
  }
}