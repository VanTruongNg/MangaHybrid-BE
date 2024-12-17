import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { RatingService } from './rating.service';
import { CreateRatingDTO } from './dto/create-rating.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Rating')
@Controller('rating')
export class RatingController {
    constructor(private readonly ratingService: RatingService) {}

    @Post('manga/:mangaId')
    @Auth({ requireVerified: true })
    @ApiOperation({ summary: 'Đánh giá manga' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async rateManga(
        @Req() req: any,
        @Param('mangaId') mangaId: string,
        @Body() createRatingDto: CreateRatingDTO
    ): Promise<void> {
        const userId = req.user._id;
        await this.ratingService.rateManga(userId, mangaId, createRatingDto);
    }

    @Get('manga/:mangaId')
    @ApiOperation({ summary: 'Lấy thông tin đánh giá của manga' })
    async getMangaRating(
        @Param('mangaId') mangaId: string
    ): Promise<{ averageRating: number; totalRatings: number }> {
        return this.ratingService.getMangaRating(mangaId);
    }

    @Get('manga/:mangaId/user')
    @Auth()
    @ApiOperation({ summary: 'Lấy điểm đánh giá của user cho manga' })
    async getUserRating(
        @Req() req: any,
        @Param('mangaId') mangaId: string
    ): Promise<{ score: number | null }> {
        const userId = req.user._id;
        const score = await this.ratingService.getUserRating(userId, mangaId);
        return { score };
    }
}
