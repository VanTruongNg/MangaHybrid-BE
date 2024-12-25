import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Genre } from './schemas/genre.schema';
import { Model } from 'mongoose';
import { GenresDTO } from './dto/genres.dto';

@Injectable()
export class GenresService {
    constructor(
        @InjectModel(Genre.name) private readonly genreModel: Model<Genre>
    ) {}

    async findAll(): Promise<Genre[]> {
        return this.genreModel.find()
    }

    async findById(id: string): Promise<Genre> {
        const genre = await this.genreModel.findById(id).populate('manga')
        if (!genre) {
            throw new NotFoundException(`Không tồn tại id ${id}`)
        }
        return genre
    }

    async createGenre(createGenreDTO: GenresDTO): Promise<Genre> {
        const existingGenre = await this.genreModel.findOne({
            name: { $regex: new RegExp(`^${createGenreDTO.name}$`, 'i') }
        });

        if (existingGenre) {
            throw new ConflictException(`Thể loại "${createGenreDTO.name}" đã tồn tại`);
        }

        const createGenre = await this.genreModel.create(createGenreDTO);
        return createGenre;
    }
}
