import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User } from 'src/auth/schemas/user.schema';
import { Manga } from 'src/manga/schemas/manga.schema';
import { Chapter } from 'src/chapters/schemas/chapter.shema';
import { Comment } from './schema/comment.schema';

@Injectable()
export class CommentService {
    constructor(
        @InjectModel(Comment.name) private commentModel: Model<Comment>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Manga.name) private mangaModel: Model<Manga>,
        @InjectModel(Chapter.name) private chapterModel: Model<Chapter>
    ) {}

    async createComment(userId: string, createCommentDto: CreateCommentDto): Promise<Comment> {
        const { content, mangaId, chapterId, parentCommentId, replyToUserId } = createCommentDto;

        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new HttpException('USER.NOT_FOUND', HttpStatus.NOT_FOUND);
        }

        let targetManga = null;
        let targetChapter = null;

        if (mangaId) {
            targetManga = await this.mangaModel.findById(mangaId);
            if (!targetManga) {
                throw new HttpException('MANGA.NOT_FOUND', HttpStatus.NOT_FOUND);
            }
        }

        if (chapterId) {
            targetChapter = await this.chapterModel.findById(chapterId);
            if (!targetChapter) {
                throw new HttpException('CHAPTER.NOT_FOUND', HttpStatus.NOT_FOUND);
            }
        }

        const comment = new this.commentModel({
            user: userId,
            content,
            manga: mangaId,
            chapter: chapterId
        });

        if (parentCommentId) {
            const parentComment = await this.commentModel.findById(parentCommentId);
            if (!parentComment) {
                throw new HttpException('COMMENT.PARENT_NOT_FOUND', HttpStatus.NOT_FOUND);
            }
            
            comment.parentComment = parentComment;
            
            if (replyToUserId) {
                const replyToUser = await this.userModel.findById(replyToUserId);
                if (!replyToUser) {
                    throw new HttpException('USER.NOT_FOUND', HttpStatus.NOT_FOUND);
                }
                comment.replyToUser = replyToUser;
                comment.content = `@${replyToUser.name} ${content}`;
            }

            const savedComment = await comment.save();

            parentComment.replies.push(savedComment);
            await parentComment.save();

            if (targetManga) {
                targetManga.comments.push(savedComment._id);
                await targetManga.save();
            }

            if (targetChapter) {
                targetChapter.comments.push(savedComment._id);
                await targetChapter.save();
            }

            user.comments.push(savedComment);
            await user.save();

            return await this.commentModel.findById(savedComment._id)
                .populate('user', 'name avatarUrl')
                .populate('replyToUser', 'name')
                .lean()
                .exec();
        }

        const savedComment = await comment.save();

        if (targetManga) {
            targetManga.comments.push(savedComment._id);
            await targetManga.save();
        }

        if (targetChapter) {
            targetChapter.comments.push(savedComment._id);
            await targetChapter.save();
        }

        user.comments.push(savedComment);
        await user.save();

        return await this.commentModel.findById(savedComment._id)
            .populate('user', 'name avatarUrl')
            .lean()
            .exec();
    }

    async getCommentsByManga(mangaId: string): Promise<Comment[]> {
        return this.commentModel.find({ manga: mangaId, parentComment: null })
            .populate('user', 'name avatarUrl')
            .populate({
                path: 'replies',
                populate: [
                    { path: 'user', select: 'name avatarUrl' },
                    { path: 'replyToUser', select: 'name' }
                ]
            })
            .sort({ createdAt: -1 });
    }

    async getCommentsByChapter(chapterId: string): Promise<Comment[]> {
        return this.commentModel.find({ chapter: chapterId, parentComment: null })
            .populate('user', 'name avatarUrl')
            .populate({
                path: 'replies',
                populate: [
                    { path: 'user', select: 'name avatarUrl' },
                    { path: 'replyToUser', select: 'name' }
                ]
            })
            .sort({ createdAt: -1 });
    }
}
