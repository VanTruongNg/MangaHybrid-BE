import { Controller, Get, NotFoundException, Param, Patch, Post, Req, UseInterceptors, UploadedFile, Body, Delete, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from 'src/auth/schemas/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResetPassworDTO } from './dto/reset-password.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { Role } from 'src/auth/schemas/role.enum';  
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserProfileDTO } from './dto/user-profile.dto';
import { UpdateReadingHistoryDTO } from './dto/update-reading-history.dto';

@ApiTags('User')
@Controller('user') 
export class UserController {
    constructor(
        readonly userService: UserService
    ) {}

    @Get()
    @Auth({ roles:[Role.ADMIN], requireVerified: true })
    @ApiOperation({ summary: 'Lấy tất cả người dùng' })
    async getAllUser(): Promise<User[]> {
        return this.userService.getAllUsers();
    }

    @Get('/me')
    @Auth()
    @ApiOperation({ summary: 'Lấy thông tin cá nhân' })
    async getMyProfile(@Req() req: any): Promise<UserProfileDTO> {
        const userId = req.user._id;
        return this.userService.findById(userId, true);
    }

    @Get('/profile/:id')
    @ApiOperation({ summary: 'Lấy thông tin profile người dùng khác (public)' })
    async getUserProfile(@Param('id') userId: string): Promise<UserProfileDTO> {
        return this.userService.findById(userId, false);
    }

    @Patch('/update-avatar')
    @Auth({ requireVerified: true })
    @ApiOperation({ summary: 'Cập nhật ảnh đại diện' })
    @UseInterceptors(FileInterceptor('file'))
    async updateAvatar (@Req() req: any, @UploadedFile() file: Express.Multer.File): Promise<User> {
        const userId = req.user._id
        const updatedUser = await this.userService.updateAvatar(userId, file)
        return updatedUser
    }

    @Patch('/reset-password')
    @Auth({ requireVerified: true })
    @ApiOperation({ summary: 'Reset password' })
    async resetPassword (@Req() req: any, @Body() resetPassworDTO: ResetPassworDTO): Promise<{ message: string }>{
        const email = req.user.email
        await this.userService.changePassword(email, resetPassworDTO) 
        return { message: "Thay đổi mật khẩu thành công"}
    }

    @Auth({ requireVerified: true })
    @Patch('reading-history')
    @ApiOperation({ summary: 'Cập nhật lịch sử đọc của người dùng' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateReadingHistory(
        @Body() updateReadingHistoryDTO: UpdateReadingHistoryDTO,
        @Req() req: any
    ): Promise<void> {
        try {
            const userId = req.user._id;
            const { chapterId } = updateReadingHistoryDTO;
            await this.userService.updateReadingHistory(userId, chapterId);
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException(`Lỗi hệ thống`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Auth({ requireVerified: true })
    @Post('manga/:mangaId/follow')
    async followManga(
        @Req() req,
        @Param('mangaId') mangaId: string
    ) {
        const userId = req.user._id;
        return this.userService.toggleUserInteraction(
            userId,
            mangaId,
            'follow',
            'manga'
        );
    }
    
    @Auth({ requireVerified: true })
    @Post('manga/:mangaId/unfollow')
    async unfollowManga(
        @Req() req,
        @Param('mangaId') mangaId: string
    ) {
        const userId = req.user._id;
        return this.userService.toggleUserInteraction(
            userId,
            mangaId,
            'unfollow',
            'manga'
        );
    }

    @Auth({ requireVerified: true })
    @Post('manga/:mangaId/like')
    async likeManga(
        @Req() req,
        @Param('mangaId') mangaId: string
    ) {
        const userId = req.user._id;
        return this.userService.toggleUserInteraction(
            userId,
            mangaId,
            'like',
            'manga'
        );
    }

    @Auth({ requireVerified: true })
    @Post('manga/:mangaId/unlike')
    async unlikeManga(
        @Req() req,
        @Param('mangaId') mangaId: string
    ) {
        const userId = req.user._id;
        return this.userService.toggleUserInteraction(
            userId,
            mangaId,
            'unlike',
            'manga'
        );
    }

    @Auth({ requireVerified: true })
    @Post('manga/:mangaId/dislike')
    async dislikeManga(
        @Req() req,
        @Param('mangaId') mangaId: string
    ) {
        const userId = req.user._id;
        return this.userService.toggleUserInteraction(
            userId,
            mangaId,
            'dislike',
            'manga'
        );
    }

    @Auth({ requireVerified: true })
    @Post('manga/:mangaId/undislike')
    async undislikeManga(
        @Req() req,
        @Param('mangaId') mangaId: string
    ) {
        const userId = req.user._id;
        return this.userService.toggleUserInteraction(
            userId,
            mangaId,
            'undislike',
            'manga'
        );
    }

    @Auth({ requireVerified: true })
    @Post('follow/:userId')
    async followUser(
        @Req() req,
        @Param('userId') targetUserId: string
    ) {
        const userId = req.user._id;
        return this.userService.toggleUserInteraction(
            userId,
            targetUserId,
            'follow',
            'user'
        );
    }

    @Auth({ requireVerified: true })
    @Post('unfollow/:userId')
    async unfollowUser(
        @Req() req,
        @Param('userId') targetUserId: string
    ) {
        const userId = req.user._id;
        return this.userService.toggleUserInteraction(
            userId,
            targetUserId,
            'unfollow',
            'user'
        );
    }
}