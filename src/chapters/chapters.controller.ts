import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UploadedFiles, UseInterceptors, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { Chapter } from './schemas/chapter.shema';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateChapterDTO } from './dto/create-chapter.dto';
import { UpdateChaptersInfoDTO } from './dto/update-info.dto';
import { Role } from 'src/auth/schemas/role.enum';
import { Auth } from 'src/auth/decorators/auth.decorator';

@Controller('chapters')
export class ChaptersController {
    constructor(
        private readonly chapterService: ChaptersService
    ) {}

    @Get()
    async getAllChapters(): Promise<Chapter[]> {
        return this.chapterService.getAll()
    }

    @Get('/:id')
    async getChapterById(@Param('id') id: string): Promise<Chapter> {
        return this.chapterService.getChapterById(id)
    }

    @Auth({ roles:[Role.ADMIN, Role.UPLOADER], requireVerified: true })
    @Post('manga/:mangaId')
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
    
            const user = req.user._id.toString()
                
            return this.chapterService.createChaptersByManga(mangaId, createChapterDTO, files, user)
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }


    @Auth({ roles:[Role.ADMIN, Role.UPLOADER], requireVerified: true })
    @Patch('update-info/:chapterId')
    async updateChapterInfo (@Param('chapterId') chapterId: string, @Body() updateInfoDTO: UpdateChaptersInfoDTO, @Req() req: any): Promise<Chapter> {
        try {
            const user = req.user._id
            return this.chapterService.updateChaptersInfo(updateInfoDTO, chapterId, user)
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Auth({ roles:[Role.ADMIN, Role.UPLOADER], requireVerified: true })
    @Patch('/update-page/:chapterId')
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

    @Post('update-view/:chapterId')
    async updateView (@Param('chapterId') chapterId: string): Promise<{ message: string }> {
        try {
            await this.chapterService.updateChapterView(chapterId)
            return { message: 'Lượt xem của chapter đã được cập nhật thành công'}
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}
