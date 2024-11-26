import { forwardRef, Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { CommentSchema } from './schema/comment.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { MangaModule } from 'src/manga/manga.module';
import { ChaptersModule } from 'src/chapters/chapters.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Comment', schema: CommentSchema }]),
    AuthModule,
    forwardRef(() => MangaModule),
    forwardRef(() => ChaptersModule)
  ],
  providers: [CommentService],
  controllers: [CommentController],
  exports: [MongooseModule, CommentService]
})
export class CommentModule {}
