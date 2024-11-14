import { BullModule } from '@nestjs/bull';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailProcessor } from './email.processor';
import { EmailVerification, EmailVerificationSchema } from 'src/auth/schemas/email-verification.schema';
import { PasswordReset, PasswordResetSchema } from 'src/auth/schemas/password-reset.schema';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
    MongooseModule.forFeature([
      { name: EmailVerification.name, schema: EmailVerificationSchema },
      { name: PasswordReset.name, schema: PasswordResetSchema }
    ]),
    forwardRef(() => AuthModule),
  ],
  providers: [EmailProcessor],
  exports: [BullModule]
})
export class MessqueueModule {}