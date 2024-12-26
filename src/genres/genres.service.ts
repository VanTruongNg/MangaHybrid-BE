import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
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

    async updateGenre(id: string, updateGenreDTO: GenresDTO): Promise<Genre> {
        const genre = await this.genreModel.findById(id);
        if (!genre) {
            throw new NotFoundException(`Không tìm thấy thể loại với ID: ${id}`);
        }

        if (updateGenreDTO.name !== genre.name) {
            const existingGenre = await this.genreModel.findOne({
                _id: { $ne: id },
                name: { $regex: new RegExp(`^${updateGenreDTO.name}$`, 'i') }
            });

            if (existingGenre) {
                throw new ConflictException(`Thể loại "${updateGenreDTO.name}" đã tồn tại`);
            }
        }

        const updatedGenre = await this.genreModel.findByIdAndUpdate(
            id,
            updateGenreDTO,
            { new: true }
        );

        return updatedGenre;
    }

    async deleteGenre(id: string): Promise<void> {
        const genre = await this.genreModel.findById(id).populate('manga');
        if (!genre) {
            throw new NotFoundException(`Không tìm thấy thể loại với ID: ${id}`);
        }

        if (genre.manga && genre.manga.length > 0) {
            throw new ForbiddenException(
                `Không thể xóa thể loại này vì đang được sử dụng bởi ${genre.manga.length} manga`
            );
        }

        await this.genreModel.findByIdAndDelete(id);
    }
}
