import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GenresService } from './genres.service';
import { GenresDTO } from './dto/genres.dto';
import { AuthGuard } from '@nestjs/passport';
import { RoleGuards } from 'src/auth/RoleGuard/role.guard';
import { Roles } from 'src/auth/RoleGuard/role.decorator';
import { Role } from 'src/auth/schemas/role.enum';

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

    @UseGuards(AuthGuard(), RoleGuards)
    @Roles(Role.ADMIN)
    @Post()
    async createGenres (@Body() createGenresDTO: GenresDTO) {
        return this.genresService.createGenre(createGenresDTO)
    }
}
