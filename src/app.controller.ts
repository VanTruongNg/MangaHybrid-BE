import { Controller, Get } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Controller()
export class AppController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  getHello(): string {
    if (this.connection.readyState === 1) {
      return 'Connected to MongoDB!';
    } else {
      return 'Failed to connect to MongoDB.';
    }
  }
}
