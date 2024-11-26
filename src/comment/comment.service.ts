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

        if (chapterId) {
            targetChapter = await this.chapterModel.findById(chapterId);
            if (!targetChapter) {
                throw new HttpException('CHAPTER.NOT_FOUND', HttpStatus.NOT_FOUND);
            }
            targetManga = await this.mangaModel.findById(targetChapter.manga);
            if (!targetManga) {
                throw new HttpException('MANGA.NOT_FOUND', HttpStatus.NOT_FOUND);
            }
        } 
        else if (mangaId) {
            targetManga = await this.mangaModel.findById(mangaId);
            if (!targetManga) {
                throw new HttpException('MANGA.NOT_FOUND', HttpStatus.NOT_FOUND);
            }
        } else {
            throw new HttpException('COMMENT.INVALID_TARGET', HttpStatus.BAD_REQUEST);
        }

        const comment = new this.commentModel({
            user: userId,
            content,
            manga: targetManga._id,
            chapter: chapterId
        });

        if (parentCommentId) {
            const parentComment = await this.commentModel.findById(parentCommentId);
            if (!parentComment) {
                throw new HttpException('COMMENT.PARENT_NOT_FOUND', HttpStatus.NOT_FOUND);
            }

            const rootComment = parentComment.parentComment ? 
                await this.commentModel.findById(parentComment.parentComment) 
                : parentComment;
        
            comment.parentComment = rootComment;

            if (replyToUserId) {
                const replyToUser = await this.userModel.findById(replyToUserId);
                if (!replyToUser) {
                    throw new HttpException('USER.NOT_FOUND', HttpStatus.NOT_FOUND);
                }
                comment.replyToUser = replyToUser;
                comment.content = `${replyToUser.name} ${content}`;
                comment.mentions = [{
                    userId: replyToUser,
                    username: replyToUser.name,
                    startIndex: 0,
                    endIndex: replyToUser.name.length
                }];
            }

            const savedComment = await comment.save();
            
            rootComment.replies.push(savedComment);
            await rootComment.save();

            if (targetManga) {
                targetManga.comments.push(savedComment);
                await targetManga.save();
            }

            if (targetChapter) {
                targetChapter.comments.push(savedComment);
                await targetChapter.save();
            }

            user.comments.push(savedComment);
            await user.save();

            return this.commentModel.findById(savedComment._id)
                .populate('user', '_id name avatarUrl')
                .populate('replyToUser', '_id name')
                .lean()
                .exec();
        }

        const savedComment = await comment.save();

        if (targetManga) {
            targetManga.comments.push(savedComment);
            await targetManga.save();
        }

        if (targetChapter) {
            targetChapter.comments.push(savedComment);
            await targetChapter.save();
        }

        user.comments.push(savedComment);
        await user.save();

        return this.commentModel.findById(savedComment._id)
            .populate('user', '_id name avatarUrl')
            .populate('replyToUser', '_id name')
            .lean()
            .exec();
    }

    async getCommentsByManga(mangaId: string): Promise<Comment[]> {
        return this.commentModel.find({ manga: mangaId, parentComment: null })
            .populate('user', '_id name avatarUrl') 
            .populate({
                path: 'replies',
                select: '_id',
            })
            .populate('mentions.userId', '_id name')
            .sort({ createdAt: -1 });
    }
    
    async getCommentsByChapter(chapterId: string): Promise<Comment[]> {
        return this.commentModel.find({ chapter: chapterId, parentComment: null })
            .populate('user', '_id name avatarUrl')
            .populate({
                path: 'replies',
                select: '_id',
            })
            .populate('mentions.userId', '_id name')
            .sort({ createdAt: -1 });
    }

    async getCommentReplies(commentId: string): Promise<Comment[]> {
        const comment = await this.commentModel.findById(commentId);
        if (!comment) {
            throw new HttpException('COMMENT.NOT_FOUND', HttpStatus.NOT_FOUND);
        }
        
        if (comment.chapter) {
            return this.commentModel.find({ 
                parentComment: commentId,
                chapter: comment.chapter 
            })
            .populate('user', '_id name avatarUrl')
            .populate('replyToUser', '_id name')
            .populate('mentions.userId', '_id name')
            .sort({ createdAt: -1 });
        }

        return this.commentModel.find({ 
            parentComment: commentId,
            manga: comment.manga 
        })
            .populate('user', '_id name avatarUrl')
            .populate('replyToUser', '_id name')
            .populate('mentions.userId', '_id name')
            .sort({ createdAt: -1 });
    }
}
