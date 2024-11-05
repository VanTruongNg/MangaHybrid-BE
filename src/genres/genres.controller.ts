import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GenresService } from './genres.service';
import { GenresDTO } from './dto/genres.dto';
import { AuthGuard } from '@nestjs/passport';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Role } from 'src/auth/schemas/role.enum';
import { Auth } from 'src/auth/decorators/auth.decorator';

@Controller('genres')
export class GenresController {
    constructor(
        readonly genresService: GenresService
    ) {}
    
    @Get()
    async getAll() {
        return this.genresService.findAll();
    }

    @Get(':id')
    async getGenresById(@Param('id') id: string) {
        return this.genresService.findById(id)
    }

    @Auth({ roles:[Role.ADMIN], requireVerified: true })
    @Post()
    async createGenres (@Body() createGenresDTO: GenresDTO) {
        return this.genresService.createGenre(createGenresDTO)
    }
}
