import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { MangaModule } from './manga/manga.module';
import { ChaptersModule } from './chapters/chapters.module';
import { GenresModule } from './genres/genres.module';
import { AwsModule } from './aws/aws.module';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { UserModule } from './user/user.module';
import { MessqueueModule } from './messqueue/messqueue.module';
import { WebsocketModule } from './websocket/websocket.module';
import { CommentModule } from './comment/comment.module';
import { RatingModule } from './rating/rating.module';
import { NotificationModule } from './notification/notification.module';
import { BullModule, BullRootModuleOptions } from '@nestjs/bull';
import { ChatRoomModule } from './chat-room/chat-room.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<BullRootModuleOptions> => ({
        redis: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD'),
          tls: configService.get<boolean>('REDIS_TLS') ? {} : undefined,
        }
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    AuthModule,
    MangaModule,
    ChaptersModule,
    GenresModule,
    AwsModule,
    UserModule,
    MessqueueModule,
    WebsocketModule,
    CommentModule,
    RatingModule,
    NotificationModule,
    ChatRoomModule,
    SearchModule,
  ],
  controllers: [AppController, UserController],
  providers: [AppService, UserService],
})
export class AppModule {}
