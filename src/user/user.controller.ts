import { Controller, Get, NotFoundException, Param, Patch, Post, Req, UseGuards, UseInterceptors, UploadedFile, Body, Delete, InternalServerErrorException, HttpCode } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from 'src/auth/schemas/user.schema';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResetPassworDTO } from './dto/reset-password.dto';
import { RoleGuards } from 'src/auth/RoleGuard/role.guard';
import { Roles } from 'src/auth/RoleGuard/role.decorator';
import { Role } from 'src/auth/schemas/role.enum';

@Controller('user')
export class UserController {
    constructor(
        readonly userService: UserService
    ) {}

    @Get()
    @UseGuards(AuthGuard(), RoleGuards)
    @Roles(Role.ADMIN)
    async getAllUser(): Promise<User[]> {
        return this.userService.getAllUsers();
    }

    @Get()
    @UseGuards(AuthGuard())
    async getUserById(@Req() req: any): Promise<User> {
        const userId = req.user._id
        return this.userService.findById(userId)
    }

    @Post('/follow/:id')
    @UseGuards(AuthGuard())
    async followUser (@Req() req: any, @Param('id') followUserId: string) {
        const userId = req.user._id

        if (!followUserId) {
            throw new NotFoundException("User not found")
        }

        await this.userService.followUser(userId, followUserId)
        return { message: `Theo dõi thành công`}
    }

    @Patch('/update-avatar')
    @UseGuards(AuthGuard())
    @UseInterceptors(FileInterceptor('file'))
    async updateAvatar (@Req() req: any, @UploadedFile() file: Express.Multer.File): Promise<User> {
        const userId = req.user._id
        const updatedUser = await this.userService.updateAvatar(userId, file)
        return updatedUser
    }

    @Patch('/reset-password')
    @UseGuards(AuthGuard())
    async resetPassword (@Req() req: any, @Body() resetPassworDTO: ResetPassworDTO): Promise<{ message: string }>{
        const email = req.user.email
        await this.userService.changePassword(email, resetPassworDTO) 
        return { message: "Thay đổi mật khẩu thành công"}
    }

    @Post('/like-manga/:mangaId')
    @UseGuards(AuthGuard())
    @HttpCode(200)
    async likeManga(@Req() req: any, @Param('mangaId') mangaId: string): Promise<{ message: string }> {
        try {
            const user = req.user._id;
            await this.userService.likeManga(user, mangaId);
            return { message: 'Manga đã được thích thành công' };
        } catch (err) {
            throw new InternalServerErrorException(`Không thể thích manga: ${err.message}`);
        }
    }

    @Delete('/unlike-manga/:mangaId')
    @UseGuards(AuthGuard())
    async unlikeManga (@Req() req: any, @Param('mangaId') mangaId: string): Promise<{message: string}> {
        try {
            const user = req.user._id;
            await this.userService.unlikeManga(user, mangaId);
            return { message: 'Ngừng thích Manga thành công' };
        } catch (err) {
            throw new InternalServerErrorException(`Không thể thích manga: ${err.message}`);
        }
    }

    @Post('/dislike-manga/:mangaId')
    @UseGuards(AuthGuard())
    @HttpCode(200)
    async dislikeManga(@Req() req: any, @Param('mangaId') mangaId: string): Promise<{ message: string }> {
        try {
            const user = req.user._id;
            await this.userService.dislikeManga(user, mangaId);
            return { message: 'Dislike Manga' };
        } catch (err) {
            throw new InternalServerErrorException(`Không thể thích manga: ${err.message}`);
        }
    }

    @Delete('/undislike-manga/:mangaId')
    @UseGuards(AuthGuard())
    async undislikeManga (@Req() req: any, @Param('mangaId') mangaId: string): Promise<{message: string}> {
            const user = req.user._id;
            await this.userService.undislikeManga(user, mangaId);
            return { message: 'Undislike Manga' };
    }
}