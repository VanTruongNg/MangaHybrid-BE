import { ResetPassworDTO } from './dto/reset-password.dto';
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';
import { AwsService } from 'src/aws/aws.service';
import * as bcrypt from 'bcryptjs'
import { Manga } from 'src/manga/schemas/manga.schema';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(Manga.name) private readonly mangaModel: Model<Manga>,
        private readonly awsService: AwsService
    ){}

    async getAllUsers(): Promise<User[]> {
        return this.userModel.find()
    }

    async findById(id: string): Promise<User> {
        const user = await this.userModel
        .findById(id)
        .populate('following', 'name avatarUrl')
        .populate('followers', 'name avatarUrl')
        .lean();
        if (!user) {
            throw new NotFoundException(`Không tìm thấy User có ID: ${id}`)
        }
        return user
    } 

    async updateAvatar(userId: string, file: Express.Multer.File): Promise<User> {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new NotFoundException(`Không tìm thấy User có ID: ${userId}`)
        }
        const fileName = userId.toString()
        const avatarUrl = await this.awsService.uploadFile(file, fileName)

        user.avatarUrl = avatarUrl

        await user.save()
        
        return user
    }

    async followUser (userId: string, followUserId: string): Promise<void> {
        if (userId === followUserId) {
            throw new Error("Bạn không thể follow chính bản thân bạn!")
        }

        const user = await this.userModel.findById(userId)
        const followUser = await this.userModel.findById(followUserId)

        if (!user || !followUser) {
            throw new NotFoundException("Không tim thấy User")
        }

        const alreadyFollowed = user.following.some(followedUserId => followedUserId.toString() === followUser._id.toString())

        if (!alreadyFollowed) {
            user.following.push(followUser)
            followUser.followers.push(user)

            await user.save()
            await followUser.save()
        } else {
            throw new Error("Bạn đã follow người này rồi")
        }
    }

    async unfollowUser (userId: string, followUserId: string): Promise<void> {
        if (userId === followUserId) {
            throw new Error("Bạn không thể unfollow chính bản thân bạn!")
        }

        const user = await this.userModel.findById(userId)
        const followUser = await this.userModel.findById(followUserId)

        if (!user || !followUser) {
            throw new NotFoundException("Không tim thấy User")
        }

        const alreadyFollowed = user.following.some(fl => fl.following.toString() === followUserId)
        if (!alreadyFollowed) {
            throw new Error("Bạn chưa follow Uploader này")
        }
        user.following = user.following.filter(fl => fl.following.toString() !== followUserId)
        followUser.followers = user.followers.filter(fl => fl.followers.toString() !== userId)

        await user.save()
        await followUser.save()
    }

    async changePassword (email: string, resetPassworDTO: ResetPassworDTO): Promise<void> {
        const { oldPassword, newPassword, confirmPassword } = resetPassworDTO

        const user = await this.userModel.findOne({ email })
        if (!user) {
            throw new NotFoundException(`Không tìm thấy User có email: ${email}`)
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password)
        if (!isMatch) {
            throw new Error ("Mật khẩu cũ không chính xác!")
        }
        if (newPassword !== confirmPassword) {
            throw new Error("Mật khẩu mới và mật khẩu xác nhận phải giống nhau!")
        }

        user.password = await bcrypt.hash(newPassword, 10)
        await user.save()
    }

    async likeManga(userId: string, mangaId: string): Promise<void> {
        const user = await this.userModel.findById (userId)
        if (!user) {
            throw new UnauthorizedException(`Không tìm thấy User ${userId}`)
        }

        const manga = await this.mangaModel.findById(mangaId)
        if (!manga) {
            throw new NotFoundException(`Manga ${mangaId} không tồn tại`)
        }

        const index = user.favoritesManga.findIndex(fav => fav.toString() === mangaId)
        if (index !== -1) {
            throw new ConflictException(`${manga.title} đã được bạn thích trước đây`)
        }

        user.favoritesManga.push(manga)
        manga.like += 1

        await user.save()
        await manga.save()
    }

    async unlikeManga(userId: string, mangaId: string): Promise<void> {
        const user = await this.userModel.findById (userId)
        if (!user) {
            throw new UnauthorizedException(`Không tìm thấy User ${userId}`)
        }

        const manga = await this.mangaModel.findById(mangaId)
        if (!manga) {
            throw new NotFoundException(`Manga ${mangaId} không tồn tại`)
        }

        const index = user.favoritesManga.findIndex(fav => fav.toString() === mangaId)
        if (index === -1) {
            throw new ConflictException(`${manga.title} chưa được bạn thích trước đây`)
        }

        user.favoritesManga.splice(index, 1)
        manga.like -= 1

        await user.save()
        await manga.save()
    }

    async dislikeManga (userId: string, mangaId: string): Promise<void> {
        const user = await this.userModel.findById (userId)
        if (!user) {
            throw new UnauthorizedException(`Không tìm thấy User ${userId}`)
        }

        const manga = await this.mangaModel.findById(mangaId)
        if (!manga) {
            throw new NotFoundException(`Manga ${mangaId} không tồn tại`)
        }

        const index = user.dislikedManga.findIndex(fav => fav.toString() === mangaId)
        if (index !== -1) {
            throw new ConflictException(`Bạn đã dislike ${manga.title} trước đây`)
        }

        user.dislikedManga.push(manga)
        manga.disLike += 1

        await user.save()
        await manga.save()

    }

    async undislikeManga(userId: string, mangaId: string): Promise<void> {
        const user = await this.userModel.findById (userId)
        if (!user) {
            throw new UnauthorizedException(`Không tìm thấy User ${userId}`)
        }

        const manga = await this.mangaModel.findById(mangaId)
        if (!manga) {
            throw new NotFoundException(`Manga ${mangaId} không tồn tại`)
        }

        const index = user.dislikedManga.findIndex(fav => fav.toString() === mangaId)
        if (index === -1) {
            throw new ConflictException(`${manga.title} chưa được bạn thích trước đây`)
        }

        user.dislikedManga.splice(index ,1)
        manga.disLike -= 1

        await user.save()
        await manga.save()
    }
}
