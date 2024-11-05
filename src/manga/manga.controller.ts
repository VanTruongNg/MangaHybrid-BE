import { 
    BadRequestException, Body, Controller, FileTypeValidator, Get, 
    MaxFileSizeValidator, Param, ParseFilePipe, Post, Req, UploadedFile, UseGuards, UseInterceptors 
} from '@nestjs/common';
import { MangaService } from './manga.service';
import { Manga } from './schemas/manga.schema';
import { AuthGuard } from '@nestjs/passport';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Role } from 'src/auth/schemas/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateMangaDTO } from './dto/create-manga.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';

@Controller('manga')
export class MangaController {
    constructor(
        readonly mangaService: MangaService
    ) {}

    @Get()
    async getAll(): Promise<Manga[]> {
        return this.mangaService.findAll();
    }
    
    @Get('daily-view')
    async getDailyView(): Promise<Manga[]>{
        return this.mangaService.findTopMangaByViewsToday()
    }

    @Get('weekly-view')
    async getWeeklyView(): Promise<Manga[]>{
        return this.mangaService.findTopMangaByViewsThisWeek()
    }

    @Get('/:id')
    async getById (@Param('id') id: string): Promise<Manga>{
        return this.mangaService.findById(id)
    }

    @Auth({ roles:[Role.ADMIN, Role.UPLOADER], requireVerified: true })
    @UseInterceptors(FileInterceptor('coverImg', {
        limits: {
            fileSize: 5 * 1024 * 1024
        }
    }))
    @Post('/create-manga')
    async createManga(@Req() req: any, @Body() createMangaDTO: CreateMangaDTO, @UploadedFile(new ParseFilePipe ({
        validators: [
            new FileTypeValidator({ fileType: 'image/jpeg|image/png',}),
            new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024})
        ]
    })) file: Express.Multer.File) : Promise<Manga> {
        if (!file) {
            throw new BadRequestException ('Hãy thêm ảnh bìa vào!')
        }

        const user = req.user._id
        return await this.mangaService.createManga(user, createMangaDTO, file)
    }   
}
