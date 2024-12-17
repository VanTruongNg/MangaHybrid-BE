import { ResetPassworDTO } from './dto/reset-password.dto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';
import { AwsService } from 'src/aws/aws.service';
import * as bcrypt from 'bcryptjs'
import { Manga } from 'src/manga/schemas/manga.schema';
import { UserProfileDTO } from './dto/user-profile.dto';
import { plainToClass } from 'class-transformer';
import { Chapter } from 'src/chapters/schemas/chapter.shema';

    @Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(Manga.name) private readonly mangaModel: Model<Manga>,
        @InjectModel(Chapter.name) private readonly chapterModel: Model<Chapter>,
        private readonly awsService: AwsService
    ){}

    async getAllUsers(): Promise<User[]> {
        return this.userModel.find()
    }

    async findById(id: string): Promise<UserProfileDTO> {
        const user = await this.userModel
            .findById(id)
            .populate('following', '_id name email avatarUrl')
            .populate('followers', '_id name email avatarUrl')
            .populate('uploadedManga', '_id title author coverImg')
            .populate('favoritesManga', '_id title author coverImg')
            .populate('dislikedManga', '_id title author coverImg')
            .populate('followingManga', '_id title author coverImg')
            .populate({
                path: 'readingHistory',
                populate: [
                    {
                        path: 'manga',
                        select: '_id title author coverImg'
                    },
                    {
                        path: 'chapters.chapter',
                        select: '_id chapterName createdAt'
                    }
                ]
            })
            .populate('comments')
            .populate({
                path: 'ratings',
                populate: {
                    path: 'user manga',
                    select: '_id name email avatarUrl title author'
                }
            })
            .select('-password')
            .lean();
    
        if (!user) {
            throw new HttpException(`USER.Không tìm thấy User có ID: ${id}`, HttpStatus.NOT_FOUND);
        }
    
        return plainToClass(UserProfileDTO, user);
    }

    async updateAvatar(userId: string, file: Express.Multer.File): Promise<User> {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new HttpException(`USER.Không tìm thấy User có ID: ${userId}`, HttpStatus.NOT_FOUND)
        }
        const fileName = userId.toString()
        const avatarUrl = await this.awsService.uploadFile(file, fileName)

        user.avatarUrl = avatarUrl

        await user.save()
        
        return user
    }

    async changePassword (email: string, resetPassworDTO: ResetPassworDTO): Promise<void> {
        const { oldPassword, newPassword, confirmPassword } = resetPassworDTO

        const user = await this.userModel.findOne({ email })
        if (!user) {
            throw new HttpException(`USER.Không tìm thấy User có email: ${email}`, HttpStatus.NOT_FOUND)
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password)
        if (!isMatch) {
            throw new HttpException(`USER.Mật khẩu cũ không chính xác!`, HttpStatus.BAD_REQUEST)
        }
        if (newPassword !== confirmPassword) {
            throw new HttpException(`USER.Mật khẩu mới và mật khẩu xác nhận phải giống nhau!`, HttpStatus.BAD_REQUEST)
        }

        user.password = await bcrypt.hash(newPassword, 10)
        await user.save()
    }

    async updateReadingHistory(userId: string, chapterId: string) {
        const [user, chapter] = await Promise.all([
            this.userModel.findById(userId),
            this.chapterModel.findById(chapterId).populate('manga')
        ]);

        if (!user || !chapter) {
            throw new HttpException('INVALID_DATA', HttpStatus.NOT_FOUND);
        }

        const mangaId = chapter.manga;

        const existingManga = await this.userModel.findOne({
            _id: userId,
            'readingHistory.manga': mangaId
        });

        try {
            if (!existingManga) {
                await this.userModel.findByIdAndUpdate(
                    userId,
                    {
                        $push: {
                            readingHistory: {
                                $each: [{
                                    manga: mangaId,
                                    chapters: [{
                                        chapter: chapterId,
                                        readAt: new Date()
                                    }],
                                    updatedAt: new Date()
                                }],
                                $position: 0
                            }
                        }
                    },
                    { new: true }
                );
            } else {
                const existingChapter = await this.userModel.findOne({
                    _id: userId,
                    'readingHistory.manga': mangaId,
                    'readingHistory.chapters.chapter': chapterId
                });

                if (!existingChapter) {
                    await this.userModel.findOneAndUpdate(
                        { 
                            _id: userId,
                            'readingHistory.manga': mangaId
                        },
                        {
                            $push: {
                                'readingHistory.$.chapters': {
                                    chapter: chapterId,
                                    readAt: new Date()
                                }
                            },
                            $set: {
                                'readingHistory.$.updatedAt': new Date()
                            }
                        },
                        { new: true }
                    );
                }
            }
        } catch (error) {
            console.error('Error updating reading history:', error);
            throw new HttpException('Failed to update reading history', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async toggleUserInteraction(
        userId: string,
        targetId: string,
        action: 'follow' | 'unfollow' | 'like' | 'unlike' | 'dislike' | 'undislike',
        type: 'user' | 'manga'
    ) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new HttpException('USER.NOT_FOUND', HttpStatus.NOT_FOUND);
        }
    
        let target;
        let userArrayField: string;
        let mangaCountField: string;
    
        const targetObjectId = new Types.ObjectId(targetId);
    
        if (type === 'user') {
            if (userId === targetId) {
                throw new HttpException('USER.CANNOT_SELF_FOLLOW', HttpStatus.BAD_REQUEST);
            }
            target = await this.userModel.findById(targetObjectId);
            userArrayField = 'following';
        } else {
            target = await this.mangaModel.findById(targetObjectId);
            switch(action) {
                case 'follow':
                case 'unfollow':
                    userArrayField = 'followingManga';
                    mangaCountField = 'followers';
                    break;
                case 'like':
                case 'unlike':
                    userArrayField = 'favoritesManga';
                    mangaCountField = 'like';
                    break;
                case 'dislike':
                case 'undislike':
                    userArrayField = 'dislikedManga';
                    mangaCountField = 'disLike';
                    break;
            }
        }
    
        if (!target) {
            throw new HttpException(
                `${type.toUpperCase()}.NOT_FOUND`,
                HttpStatus.NOT_FOUND
            );
        }
    
        const isAction = action.startsWith('un') ? '$pull' : '$addToSet';
        const isUndo = action.startsWith('un');
    
        const currentState = {
            isFollowing: user.followingManga.some(id => id.toString() === targetObjectId.toString()),
            isLiked: user.favoritesManga.some(id => id.toString() === targetObjectId.toString()),
            isDisliked: user.dislikedManga.some(id => id.toString() === targetObjectId.toString())
        };
    
        if (type === 'manga' && (action === 'like' || action === 'dislike')) {
            const oppositeField = action === 'like' ? 'dislikedManga' : 'favoritesManga';
            const oppositeCount = action === 'like' ? 'disLike' : 'like';
            const isOpposite = currentState[action === 'like' ? 'isDisliked' : 'isLiked'];
    
            if (isOpposite) {
                await Promise.all([
                    this.userModel.updateOne(
                        { _id: userId },
                        { $pull: { [oppositeField]: targetObjectId } }
                    ),
                    this.mangaModel.updateOne(
                        { _id: targetObjectId },
                        { $inc: { [oppositeCount]: -1 } }
                    )
                ]);
            }
        }
        if (type === 'user') {
            await Promise.all([
                this.userModel.updateOne(
                    { _id: userId },
                    { [isAction]: { [userArrayField]: targetObjectId } }
                ),
                this.userModel.updateOne(
                    { _id: targetObjectId },
                    { [isAction]: { followers: new Types.ObjectId(userId) } }
                )
            ]);
        } else {
            await Promise.all([
                this.userModel.updateOne(
                    { _id: userId },
                    { [isAction]: { [userArrayField]: targetObjectId } }
                ),
                this.mangaModel.updateOne(
                    { _id: targetObjectId },
                    { $inc: { [mangaCountField]: isUndo ? -1 : 1 } }
                )
            ]);
        }
    }
}
