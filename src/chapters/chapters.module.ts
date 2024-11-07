import { MangaModule } from './../manga/manga.module';
import { Module } from '@nestjs/common';
import { ChaptersController } from './chapters.controller';
import { ChaptersService } from './chapters.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ChapterSchema } from './schemas/chapter.shema';
import { AuthModule } from 'src/auth/auth.module';
import { AwsModule } from 'src/aws/aws.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{name: 'Chapter', schema: ChapterSchema}]),
    AuthModule,
    MangaModule,
    AwsModule,
    UserModule,
  ],
  controllers: [ChaptersController],
  providers: [ChaptersService],
  exports: [MongooseModule]
})
export class ChaptersModule {}
