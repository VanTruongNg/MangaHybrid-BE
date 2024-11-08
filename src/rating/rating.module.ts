import { Module } from '@nestjs/common';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';
import { RatingSchema } from './schema/rating.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { MangaModule } from 'src/manga/manga.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Rating', schema: RatingSchema }]),
    AuthModule,
    MangaModule
  ],
  providers: [RatingService],
  controllers: [RatingController]
})
export class RatingModule {}
