import { Module } from '@nestjs/common';
import { AwsService } from './aws.service';
import { ConfigModule } from '@nestjs/config';
import { AwsController } from './aws.controller';

@Module({
  imports: [ConfigModule],
  providers: [AwsService],
  controllers: [AwsController],
  exports: [AwsService]
})
export class AwsModule {}
