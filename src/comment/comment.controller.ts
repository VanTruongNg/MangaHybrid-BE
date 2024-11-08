import { Controller, Param, Req, Post, HttpException, HttpStatus, Body, Get } from '@nestjs/common';
import { CommentService } from './comment.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './schema/comment.schema';

@Controller('comment')
export class CommentController {
    constructor(
        private readonly commentService: CommentService
    ) {}

    @Post('manga/:mangaId')
    @Auth({ requireVerified: true })
    async createMangaComment(
        @Req() req: any,
        @Param('mangaId') mangaId: string,
        @Body() createCommentDto: CreateCommentDto
    ): Promise<Comment> {
        try {
            return await this.commentService.createComment(req.user._id, {
                ...createCommentDto,
                mangaId
            });
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('chapter/:chapterId')
    @Auth({ requireVerified: true })
    async createChapterComment(
        @Req() req: any,
        @Param('chapterId') chapterId: string,
        @Body() createCommentDto: CreateCommentDto
    ): Promise<Comment> {
        try {
            return await this.commentService.createComment(req.user._id, {
                ...createCommentDto,
                chapterId
            });
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('manga/:mangaId')
    async getMangaComments(@Param('mangaId') mangaId: string): Promise<Comment[]> {
        try {
            return await this.commentService.getCommentsByManga(mangaId);
        } catch (error) {
            throw error instanceof HttpException 
                ? error 
                : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('chapter/:chapterId')
    async getChapterComments(@Param('chapterId') chapterId: string): Promise<Comment[]> {
        try {
            return await this.commentService.getCommentsByChapter(chapterId);
        } catch (error) {
            throw error instanceof HttpException 
                ? error 
                : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
