import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from 'src/auth/schemas/user.schema';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenSchema } from './schemas/token.schema';
import { EmailVerificationSchema } from './schemas/email-verification.schema';
import { MessqueueModule } from 'src/messqueue/messqueue.module';
import { PasswordResetSchema } from './schemas/password-reset.schema';
import { Reflector } from '@nestjs/core';
import { JwtStrategy } from './strategies/jwt.strategy';
import { WsStrategy } from './strategies/ws.strategy';
import { WsAuthGuard } from './guards/ws-auth.guard';

@Module({
  imports:[
    PassportModule.register({defaultStrategy: 'jwt'}),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: config.get<string | number>('JWT_EXPIRES')
          }
        }
      }
    }),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Token', schema: TokenSchema },
      { name: 'EmailVerification', schema: EmailVerificationSchema},
      { name: 'PasswordReset', schema: PasswordResetSchema}
    ]),
    MessqueueModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, 
    JwtStrategy,
    WsStrategy,
    WsAuthGuard,
    Reflector],
  exports: [
    JwtStrategy,
    WsStrategy,
    WsAuthGuard,
    PassportModule,
    MongooseModule]
})
export class AuthModule {}
