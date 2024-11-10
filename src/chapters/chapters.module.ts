import { MangaModule } from './../manga/manga.module';
import { Module } from '@nestjs/common';
import { ChaptersController } from './chapters.controller';
import { ChaptersService } from './chapters.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ChapterSchema } from './schemas/chapter.shema';
import { AuthModule } from 'src/auth/auth.module';
import { AwsModule } from 'src/aws/aws.module';
import { UserModule } from 'src/user/user.module';
import { WebsocketModule } from 'src/websocket/websocket.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([{name: 'Chapter', schema: ChapterSchema}]),
    AuthModule,
    MangaModule,
    AwsModule,
    UserModule,
    NotificationModule,
    WebsocketModule
  ],
  controllers: [ChaptersController],
  providers: [ChaptersService],
  exports: [MongooseModule]
})
export class ChaptersModule {}
