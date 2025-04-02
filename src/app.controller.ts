import { Controller, Get } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  @ApiOperation({ summary: 'Kiểm tra kết nối MongoDB' })
  getHello(): string {
    if (this.connection.readyState === 1) {
      return 'Connected to MongoDB!';
    } else {
      return 'Failed to connect to MongoDB.';
    }
  }
}
