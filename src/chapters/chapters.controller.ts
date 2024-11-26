import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UploadedFiles, UseInterceptors, Req, HttpException, HttpStatus, Res } from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { Chapter, ChapterType } from './schemas/chapter.shema';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateChapterDTO } from './dto/create-chapter.dto';
import { UpdateChaptersInfoDTO } from './dto/update-info.dto';
import { Role } from 'src/auth/schemas/role.enum';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Chapters')
@Controller('chapters')
export class ChaptersController {
    constructor(
        private readonly chapterService: ChaptersService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Lấy tất cả chapter' })
    async getAllChapters(): Promise<Chapter[]> {
        return this.chapterService.getAll()
    }

    @Get('/:id')
    @ApiOperation({ summary: 'Lấy chi tiết chapter' })
    async getChapterById(@Param('id') id: string): Promise<Chapter> {
        return this.chapterService.getChapterDetail(id)
    }

    @Auth({ roles:[Role.ADMIN, Role.UPLOADER], requireVerified: true })
    @Post('manga/:mangaId')
    @ApiOperation({ summary: 'Tạo chapter' })
    @UseInterceptors(FilesInterceptor('files'))
    async createChaptersByManga (
        @Param('mangaId') mangaId: string, 
        @Body() createChapterDTO: CreateChapterDTO, 
        @UploadedFiles() files: Express.Multer.File[],
        @Req() req: any
    ): Promise<Chapter> {
        try {
            if (!files || files.length === 0) {
                throw new NotFoundException("Bạn chưa tải file lên")
            }

            if (createChapterDTO.chapterType && !Object.values(ChapterType).includes(createChapterDTO.chapterType)) {
                throw new HttpException('Loại chapter không hợp lệ', HttpStatus.BAD_REQUEST);
            }

            if (createChapterDTO.chapterType === ChapterType.NORMAL && !createChapterDTO.number) {
                throw new HttpException('Số chapter là bắt buộc đối với chapter thường', HttpStatus.BAD_REQUEST);
            }
    
            const user = req.user._id.toString()
                
            return this.chapterService.createChaptersByManga(mangaId, createChapterDTO, files, user)
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }


    @Auth({ roles:[Role.ADMIN, Role.UPLOADER], requireVerified: true })
    @Patch('update-info/:chapterId')
    @ApiOperation({ summary: 'Cập nhật thông tin chapter' })
    async updateChapterInfo (
        @Param('chapterId') chapterId: string, 
        @Body() updateInfoDTO: UpdateChaptersInfoDTO, 
        @Req() req: any
    ): Promise<Chapter> {
        try {
            if (updateInfoDTO.chapterType && !Object.values(ChapterType).includes(updateInfoDTO.chapterType)) {
                throw new HttpException('Loại chapter không hợp lệ', HttpStatus.BAD_REQUEST);
            }

            if (updateInfoDTO.chapterType === ChapterType.NORMAL && !updateInfoDTO.number) {
                throw new HttpException('Số chapter là bắt buộc đối với chapter thường', HttpStatus.BAD_REQUEST);
            }

            const user = req.user._id
            return this.chapterService.updateChaptersInfo(updateInfoDTO, chapterId, user)
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Auth({ roles:[Role.ADMIN, Role.UPLOADER], requireVerified: true })
    @Patch('/update-page/:chapterId')
    @ApiOperation({ summary: 'Cập nhật link trang chapter' })
    @UseInterceptors(FilesInterceptor('files'))
    async updatePageUrl (@Req() req: any, @UploadedFiles() files: Express.Multer.File[], @Param('chapterId') chapterId: string): Promise<Chapter> {
        try {
            const user = req.user._id
            if (!files || files.length === 0) {
                throw new NotFoundException("Bạn chưa tải file lên")
            }

            return this.chapterService.updatePageUrl(files, chapterId, user)
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Post(':chapterId/update-view')
    @ApiOperation({ summary: 'Cập nhật lượt xem chapter' })
    async updateView (@Param('chapterId') chapterId: string): Promise<{ message: string }> {
        try {
            await this.chapterService.updateChapterView(chapterId)
            return { message: 'Lượt xem của chapter đã được cập nhật thành công'}
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Get(':id/download')
    @ApiOperation({ summary: 'Tải chapter dạng CBZ' }) 
    async downloadChapterCbz(
        @Param('id') chapterId: string,
        @Res() res: Response
    ) {
        const zipBuffer = await this.chapterService.generateChapterZip(chapterId);

        const chapter = await this.chapterService.findById(chapterId);
        
        res.set({
            'Content-Type': 'application/vnd.comicbook+zip',
            'Content-Disposition': `attachment; filename="chapter-${chapter.number}.cbz"`
        });
        
        res.send(zipBuffer);
    }
}
