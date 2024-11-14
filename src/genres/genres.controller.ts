import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GenresService } from './genres.service';
import { GenresDTO } from './dto/genres.dto';
import { Role } from 'src/auth/schemas/role.enum';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Genres')
@Controller('genres')
export class GenresController {
    constructor(
        readonly genresService: GenresService
    ) {}
    
    @Get()
    @ApiOperation({ summary: 'Lấy tất cả thể loại' })
    async getAll() {
        return this.genresService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thể loại theo id' })
    async getGenresById(@Param('id') id: string) {
        return this.genresService.findById(id)
    }

    @Auth({ roles:[Role.ADMIN], requireVerified: true })
    @Post()
    @ApiOperation({ summary: 'Tạo thể loại' })
    async createGenres (@Body() createGenresDTO: GenresDTO) {
        return this.genresService.createGenre(createGenresDTO)
    }
}
