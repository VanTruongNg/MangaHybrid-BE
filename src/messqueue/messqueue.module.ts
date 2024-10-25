import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/auth/auth.module';
import { EmailProcessor } from './email.processor';

@Module({
    imports: [
        BullModule.registerQueue({
          name: 'email',
        }),
        forwardRef(() => AuthModule),
        ConfigModule
      ],
    providers: [EmailProcessor],
    exports: [BullModule]
})
export class MessqueueModule {}
