import { Controller, Param, Req, Post, HttpException, HttpStatus, Body, Get } from '@nestjs/common';
import { CommentService } from './comment.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './schema/comment.schema';
import { ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('Comment')
@Controller('comment')
export class CommentController {
    constructor(
        private readonly commentService: CommentService
    ) {}

    @Post(':mangaId')
    @Auth({ requireVerified: true })
    @ApiOperation({ summary: 'Tạo bình luận cho manga' })
    @ApiBody({ type: CreateCommentDto })
    async createComment(
        @Param('mangaId') mangaId: string,
        @Body() createCommentDto: CreateCommentDto,
        @Req() req: any
    ): Promise<Comment> {
        return this.commentService.createComment(mangaId, createCommentDto, req.user._id);
    }

    @Get(':mangaId')
    @ApiOperation({ summary: 'Lấy danh sách bình luận của manga' })
    async getComments(@Param('mangaId') mangaId: string): Promise<Comment[]> {
        return this.commentService.getComments(mangaId);
    }

    @Post('chapter/:chapterId')
    @ApiOperation({ summary: 'Tạo comment cho chapter' })
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
    @ApiOperation({ summary: 'Lấy tất cả comment của manga' })
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
    @ApiOperation({ summary: 'Lấy tất cả comment của chapter' })
    async getChapterComments(@Param('chapterId') chapterId: string): Promise<Comment[]> {
        try {
            return await this.commentService.getCommentsByChapter(chapterId);
        } catch (error) {
            throw error instanceof HttpException 
                ? error 
                : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('replies/:commentId')
    @ApiOperation({ summary: 'Lấy replies của một comment' })
    async getCommentReplies(@Param('commentId') commentId: string): Promise<Comment[]> {
        try {
            return await this.commentService.getCommentReplies(commentId);
        } catch (error) {
            throw error instanceof HttpException 
                ? error 
                : new HttpException('Lỗi hệ thống', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
