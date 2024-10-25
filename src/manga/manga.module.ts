import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { MangaSchema, ViewLogSchema } from './schemas/manga.schema';
import { AwsModule } from 'src/aws/aws.module';
import { GenresModule } from 'src/genres/genres.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Manga', schema: MangaSchema },
      { name: 'ViewLog', schema: ViewLogSchema }]),
    AwsModule,
    GenresModule,
    UserModule,
    AuthModule
  ],
  providers: [MangaService],
  controllers: [MangaController],
  exports: [MongooseModule, MangaService]
})
export class MangaModule {}
