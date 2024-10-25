import { Module } from '@nestjs/common';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GenreSchema } from './schemas/genre.schema';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{name: 'Genre', schema: GenreSchema}]),
    AuthModule
  ],
  controllers: [GenresController],
  providers: [GenresService],
  exports: [MongooseModule]
})
export class GenresModule {}
