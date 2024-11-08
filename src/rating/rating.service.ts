import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Rating } from './schema/rating.schema';
import { Model } from 'mongoose';
import { Manga } from 'src/manga/schemas/manga.schema';
import { User } from 'src/auth/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { CreateRatingDTO } from './dto/create-rating.dto';

@Injectable()
export class RatingService {
    constructor(
        @InjectModel(Rating.name) private ratingModel: Model<Rating>,
        @InjectModel(Manga.name) private mangaModel: Model<Manga>,
        @InjectModel(User.name) private userModel: Model<User>
    ){}

    async rateManga(userId: string, mangaId: string, createRatingDto: CreateRatingDTO): Promise<void> {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new HttpException('USER.NOT_FOUND', HttpStatus.NOT_FOUND);
        }

        const manga = await this.mangaModel.findById(mangaId);
        if (!manga) {
            throw new HttpException('MANGA.NOT_FOUND', HttpStatus.NOT_FOUND);
        }

        const existingRating = await this.ratingModel.findOne({
            user: userId,
            manga: mangaId
        });

        if (existingRating) {
            manga.totalRating = manga.totalRating - existingRating.score + createRatingDto.score;
            existingRating.score = createRatingDto.score;
            await existingRating.save();
        } else {
            const newRating = new this.ratingModel({
                user: userId,
                manga: mangaId,
                score: createRatingDto.score
            });
            await newRating.save();

            manga.totalRating += createRatingDto.score;
            manga.ratingCount += 1;
        }

        manga.averageRating = manga.totalRating / manga.ratingCount;
        await manga.save();
    }

    async getMangaRating(mangaId: string): Promise<{ averageRating: number; totalRatings: number }> {
        const manga = await this.mangaModel.findById(mangaId);
        if (!manga) {
            throw new HttpException('MANGA.NOT_FOUND', HttpStatus.NOT_FOUND);
        }

        return {
            averageRating: manga.averageRating || 0,
            totalRatings: manga.ratingCount || 0
        };
    }

    async getUserRating(userId: string, mangaId: string): Promise<number | null> {
        const rating = await this.ratingModel.findOne({
            user: userId,
            manga: mangaId
        });

        return rating ? rating.score : null;
    }
}
