import { 
    BadRequestException, Body, Controller, Get, Param, Post, Put, Req, Res, UploadedFile, UploadedFiles, UseInterceptors, Query, ParseIntPipe, HttpStatus 
} from '@nestjs/common';
import { MangaService } from './manga.service';
import { Manga } from './schemas/manga.schema';
import { Role } from 'src/auth/schemas/role.enum';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { CreateMangaDTO } from './dto/create-manga.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import JSZip = require('jszip');
import axios from 'axios';
import { Response } from 'express';

@ApiTags('Manga')
@Controller('manga')    
export class MangaController {
    constructor(
        readonly mangaService: MangaService
    ) {}

    @Get()
    @ApiOperation({ summary: 'Lấy tất cả manga' })
    @Auth({ roles:[Role.ADMIN], requireVerified: true })
    async getAll(): Promise<Manga[]> {
        return this.mangaService.findAll();
    }
    
    @Get('home/web')
    @ApiOperation({ summary: 'Lấy dữ liệu trang chủ cho web' })
    async getWebHomeData(): Promise<{
        dailyTop: Manga[],
        weeklyTop: Manga[],
        monthlyTop: Manga[],
        recentUpdated: Manga[],
        randomManga: Manga[],
        topAllTime: Manga[]
    }> {
        const [dailyTop, weeklyTop, monthlyTop, recentUpdated, randomManga, topAllTime] = await Promise.all([
            this.mangaService.findTopMangaByViewsToday(1, 24),
            this.mangaService.findTopMangaByViewsThisWeek(1, 24),
            this.mangaService.findTopMangaByViewsThisMonth(1, 24),
            this.mangaService.findRecentlyUpdated(1, 24),
            this.mangaService.findRandomManga(5),
            this.mangaService.findTopMangaByTotalViews(1, 24)
        ]);

        return {
            dailyTop: dailyTop.mangas,
            weeklyTop: weeklyTop.mangas,
            monthlyTop: monthlyTop.mangas,
            recentUpdated: recentUpdated.mangas,
            randomManga,
            topAllTime: topAllTime.mangas
        };
    }

    @Get('home/mobile') 
    @ApiOperation({ summary: 'Lấy dữ liệu trang chủ cho mobile' })
    async getMobileHomeData(): Promise<{
        dailyTop: Manga[],
        weeklyTop: Manga[],
        monthlyTop: Manga[],
        recentUpdated: Manga[],
        randomManga: Manga[],
        topAllTime: Manga[]
    }> {
        const [dailyTop, weeklyTop, monthlyTop, recentUpdated, randomManga, topAllTime] = await Promise.all([
            this.mangaService.findTopMangaByViewsToday(1, 5),
            this.mangaService.findTopMangaByViewsThisWeek(1, 5),
            this.mangaService.findTopMangaByViewsThisMonth(1, 5),
            this.mangaService.findRecentlyUpdated(1, 5),
            this.mangaService.findRandomManga(5),
            this.mangaService.findTopMangaByTotalViews(1, 5)
        ]);

        return {
            dailyTop: dailyTop.mangas,
            weeklyTop: weeklyTop.mangas,
            monthlyTop: monthlyTop.mangas,
            recentUpdated: recentUpdated.mangas,
            randomManga,
            topAllTime: topAllTime.mangas
        };
    }

    @Get('/:id')
    @ApiOperation({ summary: 'Lấy manga theo id' })
    async getById (@Param('id') id: string): Promise<Manga>{
        return this.mangaService.findById(id)
    }

    @Auth({ roles:[Role.ADMIN, Role.UPLOADER], requireVerified: true })
    @ApiOperation({ summary: 'Tạo manga' })
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'coverImg', maxCount: 1 },
        { name: 'bannerImg', maxCount: 1 }
    ], {
        limits: {
            fileSize: 5 * 1024 * 1024
        },
        fileFilter: (req, file, callback) => {
            if (!file.mimetype.match(/^image\/(jpeg|png)$/)) {
                callback(new BadRequestException('Chỉ chấp nhận file ảnh định dạng JPG hoặc PNG'), false);
                return;
            }
            callback(null, true);
        }
    }))
    @Post('/create-manga')
    async createManga(
        @Req() req: any,
        @Body() createMangaDTO: CreateMangaDTO,
        @UploadedFiles() files: { coverImg: Express.Multer.File[], bannerImg: Express.Multer.File[] }
    ): Promise<Manga> {
        if (!files.coverImg?.[0] || !files.bannerImg?.[0]) {
            throw new BadRequestException('Hãy thêm đầy đủ ảnh bìa và ảnh banner!')
        }

        const user = req.user._id
        return await this.mangaService.createManga(user, createMangaDTO, {
            cover: files.coverImg[0],
            banner: files.bannerImg[0]
        })
    }

    @Auth({ roles:[Role.ADMIN, Role.UPLOADER], requireVerified: true })
    @ApiOperation({ summary: 'Cập nhật ảnh banner' })
    @UseInterceptors(FileInterceptor('bannerImg', {
        limits: {
            fileSize: 5 * 1024 * 1024
        },
        fileFilter: (req, file, callback) => {
            if (!file.mimetype.match(/^image\/(jpeg|png)$/)) {
                callback(new BadRequestException('Chỉ chấp nhận file ảnh định dạng JPG hoặc PNG'), false);
                return;
            }
            callback(null, true);
        }
    }))
    @Put('/:id/banner')
    async updateBannerImg(
        @Param('id') id: string,
        @Req() req: any,
        @UploadedFile() file: Express.Multer.File
    ): Promise<Manga> {
        if (!file) {
            throw new BadRequestException('Hãy thêm ảnh banner!')
        }
        return await this.mangaService.updateBannerImg(id, file, req.user._id)
    }

    @Auth({ roles:[Role.ADMIN, Role.UPLOADER], requireVerified: true })
    @ApiOperation({ summary: 'Cập nhật ảnh bìa' })
    @UseInterceptors(FileInterceptor('coverImg', {
        limits: {
            fileSize: 5 * 1024 * 1024
        },
        fileFilter: (req, file, callback) => {
            if (!file.mimetype.match(/^image\/(jpeg|png)$/)) {
                callback(new BadRequestException('Chỉ chấp nhận file ảnh định dạng JPG hoặc PNG'), false);
                return;
            }
            callback(null, true);
        }
    }))
    @Put('/:id/cover')
    async updateCoverImg(
        @Param('id') id: string,
        @Req() req: any,
        @UploadedFile() file: Express.Multer.File
    ): Promise<Manga> {
        if (!file) {
            throw new BadRequestException('Hãy thêm ảnh bìa!')
        }
        return await this.mangaService.updateCoverImg(id, file, req.user._id)
    }

    @Get(':id/offline-info')
    @ApiOperation({ summary: 'Lấy thông tin manga để lưu offline' })
    async getMangaOfflineInfo(
        @Param('id') mangaId: string,
        @Res() res: Response
    ) {
        const manga = await this.mangaService.findById(mangaId);
        
        const zip = new JSZip();

        const metadata = {
            id: mangaId,   
            title: manga.title,
            description: manga.description,
            author: manga.author,
            status: manga.status,
            genres: manga.genre.map(g => g.name),
            downloadedAt: new Date().toISOString()
        };

        const textEncoder = new TextEncoder();
        const jsonString = JSON.stringify(metadata, null, 2);
        const jsonBuffer = textEncoder.encode(jsonString);

        zip.file('metadata.json', jsonBuffer, {
            binary: true,
            createFolders: true,
            compression: 'DEFLATE',
            compressionOptions: {
                level: 9
            }
        });

        try {
            const [coverResponse, bannerResponse] = await Promise.all([
                axios.get(manga.coverImg, { responseType: 'arraybuffer' }),
                axios.get(manga.bannerImg, { responseType: 'arraybuffer' })
            ]);
        
            zip.file('images/cover.jpg', coverResponse.data, {
                binary: true,
                compression: 'DEFLATE'
            });
            zip.file('images/banner.jpg', bannerResponse.data, {
                binary: true,
                compression: 'DEFLATE'
            });
        } catch (error) {
            console.error('Failed to download cover/banner images:', error);
        }

        const zipBuffer = await zip.generateAsync({ 
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 9
            },
            platform: 'UNIX'
        });
        
        const sanitizedTitle = manga.title
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
        const filename = `manga-${mangaId}-${sanitizedTitle}.zip`;

        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'Content-Transfer-Encoding': 'binary',
            'X-Content-Type-Options': 'nosniff'
        });
        
        res.send(zipBuffer);
    }

    @Get('browse')
    @ApiOperation({ summary: 'Lấy danh sách manga theo loại' })
    async browseManga(
        @Query('type') type: 'daily' | 'weekly' | 'monthly' | 'latest' | 'top' = 'latest',
        @Query('page', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) page: number = 1,
        @Query('limit', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) limit: number = 24
    ): Promise<{
        mangas: Manga[],
        total: number,
        page: number,
        totalPages: number
    }> {
        if (page < 1) {
            throw new BadRequestException('Số trang phải lớn hơn 0');
        }

        if (limit < 1 || limit > 100) {
            throw new BadRequestException('Số lượng manga mỗi trang phải từ 1 đến 100');
        }

        const result = await (async () => {
            switch(type) {
                case 'daily':
                    return this.mangaService.findTopMangaByViewsToday(page, limit);
                case 'weekly':
                    return this.mangaService.findTopMangaByViewsThisWeek(page, limit);
                case 'monthly':
                    return this.mangaService.findTopMangaByViewsThisMonth(page, limit);
                case 'latest':
                    return this.mangaService.findRecentlyUpdated(page, limit);
                case 'top':
                    return this.mangaService.findTopMangaByTotalViews(page, limit);
                default:
                    return this.mangaService.findRecentlyUpdated(page, limit);
            }
        })();

        if (page > result.totalPages) {
            throw new BadRequestException('Trang yêu cầu vượt quá số trang hiện có');
        }

        return result;
    }

    @Get('uploader/:id')
    @ApiOperation({ summary: 'Lấy danh sách manga của uploader' })
    async getMangaByUploader(@Param('id') id: string): Promise<Manga[]> {
        return this.mangaService.getMangaByUploader(id)
    }

    @Auth({ roles:[Role.ADMIN], requireVerified: true })
    @ApiOperation({ summary: 'Phê duyệt manga' })
    @Put('/:id/approve')
    async approveManga(@Param('id') id: string): Promise<void> {
        return this.mangaService.approveMangaById(id)
    }
}
