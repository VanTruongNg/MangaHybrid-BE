import { Controller, Get, NotFoundException, Param, Patch, Post, Req, UseGuards, UseInterceptors, UploadedFile, Body, Delete, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from 'src/auth/schemas/user.schema';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResetPassworDTO } from './dto/reset-password.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { Role } from 'src/auth/schemas/role.enum';

@Controller('user')
export class UserController {
    constructor(
        readonly userService: UserService
    ) {}

    @Get()
    @Auth({ roles:[Role.ADMIN], requireVerified: true })
    async getAllUser(): Promise<User[]> {
        return this.userService.getAllUsers();
    }

    @Get('/me')
    @Auth()
    async getUserById(@Req() req: any): Promise<User> {
        const userId = req.user._id
        return this.userService.findById(userId)
    }

    @Post('/follow/:id')
    @Auth({ requireVerified: true })
    async followUser (@Req() req: any, @Param('id') followUserId: string) {
        const userId = req.user._id

        if (!followUserId) {
            throw new NotFoundException("User not found")
        }

        await this.userService.followUser(userId, followUserId)
        return { message: `Theo dõi thành công`}
    }

    @Patch('/update-avatar')
    @Auth({ requireVerified: true })
    @UseInterceptors(FileInterceptor('file'))
    async updateAvatar (@Req() req: any, @UploadedFile() file: Express.Multer.File): Promise<User> {
        const userId = req.user._id
        const updatedUser = await this.userService.updateAvatar(userId, file)
        return updatedUser
    }

    @Patch('/reset-password')
    @Auth({ requireVerified: true })
    async resetPassword (@Req() req: any, @Body() resetPassworDTO: ResetPassworDTO): Promise<{ message: string }>{
        const email = req.user.email
        await this.userService.changePassword(email, resetPassworDTO) 
        return { message: "Thay đổi mật khẩu thành công"}
    }

    @Post('/like-manga/:mangaId')
    @Auth({ requireVerified: true })
    @HttpCode(200)
    async likeManga(@Req() req: any, @Param('mangaId') mangaId: string): Promise<{ message: string }> {
        try {
            const user = req.user._id;
            await this.userService.likeManga(user, mangaId);
            return { message: 'Manga đã được thích thành công' };
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException(`Lỗi hệ thống`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete('/unlike-manga/:mangaId')
    @Auth({ requireVerified: true })
    async unlikeManga (@Req() req: any, @Param('mangaId') mangaId: string): Promise<{message: string}> {
        try {
            const user = req.user._id;
            await this.userService.unlikeManga(user, mangaId);
            return { message: 'Ngừng thích Manga thành công' };
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException(`Lỗi hệ thống`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/dislike-manga/:mangaId')
    @Auth({ requireVerified: true })
    @HttpCode(200)
    async dislikeManga(@Req() req: any, @Param('mangaId') mangaId: string): Promise<{ message: string }> {
        try {
            const user = req.user._id;
            await this.userService.dislikeManga(user, mangaId);
            return { message: 'Dislike Manga' };
        } catch (error) {
            throw error instanceof HttpException ? error : new HttpException(`Lỗi hệ thống`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Delete('/undislike-manga/:mangaId')
    @Auth({ requireVerified: true })
    async undislikeManga (@Req() req: any, @Param('mangaId') mangaId: string): Promise<{message: string}> {
        const user = req.user._id;
        await this.userService.undislikeManga(user, mangaId);
        return { message: 'Undislike Manga' };
    }
}