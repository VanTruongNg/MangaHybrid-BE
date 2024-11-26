import {  ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Manga, ViewLog } from 'src/manga/schemas/manga.schema';
import { CreateChapterDTO } from './dto/create-chapter.dto';
import { AwsService } from 'src/aws/aws.service';
import { Chapter, ChapterType } from './schemas/chapter.shema';
import { UpdateChaptersInfoDTO } from './dto/update-info.dto';
import { User } from 'src/auth/schemas/user.schema';
import { ApprovalStatus } from 'src/manga/schemas/status.enum';
import { NotificationType } from 'src/notification/schema/notification.schema';
import { NotificationService } from 'src/notification/notification.service';
import axios from 'axios';
import JSZip = require('jszip'); 

interface PopulatedFollower {
    _id: mongoose.Types.ObjectId;
}

@Injectable()
export class ChaptersService {
    constructor (
        @InjectModel(Manga.name) private readonly mangaModel: Model<Manga>,
        @InjectModel(Chapter.name) private readonly chaptersModel: Model<Chapter>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(ViewLog.name) private readonly viewLogModel: Model<ViewLog>,
        private readonly awsService: AwsService,
        private readonly notificationService: NotificationService,
    ) {}

    async getAll(): Promise<Chapter[]> {
        return this.chaptersModel.find();
    }

    async findById(id: string): Promise<Chapter> {
        const chapter = await this.chaptersModel.findById(id)
        if (!chapter) {
            throw new HttpException('CHAPTER.NOT_FOUND', HttpStatus.NOT_FOUND);
        }
        return chapter
    }

    async getChapterDetail(chapterId: string) {
        const chapter = await this.chaptersModel.findById(chapterId)
            .select({
                _id: 1,
                number: 1,
                chapterTitle: 1,
                chapterName: 1,
                chapterType: 1,
                pagesUrl: 1,
                views: 1,
                manga: 1
            })
            .populate('manga', '_id title')
            .lean();

        if (!chapter) {
            throw new HttpException('CHAPTER.NOT_FOUND', HttpStatus.NOT_FOUND);
        }

        const [prevChapter, nextChapter] = await Promise.all([
            this.chaptersModel.findOne({
                manga: chapter.manga,
                number: { $lt: chapter.number }
            })
            .sort({ number: -1 })
            .select('_id number chapterName')
            .lean(),

            this.chaptersModel.findOne({
                manga: chapter.manga,
                number: { $gt: chapter.number }
            })
            .sort({ number: 1 })
            .select('_id number chapterName')
            .lean()
        ]);

        return {
            ...chapter,
            navigation: {
                prevChapter: prevChapter || null,
                nextChapter: nextChapter || null
            }
        };
    }
    
    async createChaptersByManga(mangaId: string, createChapterDTO: CreateChapterDTO, files: Express.Multer.File[], userId: string): Promise<Chapter> {
        const { chapterType = ChapterType.NORMAL, ...chapterData} = createChapterDTO
    
        const manga = await this.mangaModel.findById(mangaId);
                
        if (!manga) {
            throw new HttpException("Manga.NOT_FOUND", HttpStatus.NOT_FOUND)
        }
    
        if (manga.uploader.toString() !== userId) {
            throw new HttpException("CHAPTER.FORBIDDEN", HttpStatus.FORBIDDEN)
        }
    
        if (manga.approvalStatus !== ApprovalStatus.APPROVED) {
            throw new HttpException("Manga.NOT_APPROVED", HttpStatus.CONFLICT)
        }
        
        const newChapters = new this.chaptersModel({
            ...chapterData, 
            manga: mangaId,
            chapterType
        })
        const savedChapters = await newChapters.save()
    
        manga.chapters.push(savedChapters)
        await manga.save()
    
        const sanitizedTitle = manga.title.replace(/[^\w\s]/g, '').replace(/\s+/g, '')
        let fileName = '';
        
        switch (chapterType) {
            case ChapterType.SPECIAL:
                fileName = `${sanitizedTitle}-Special`;
                break;
            case ChapterType.ONESHOT:
                fileName = `${sanitizedTitle}-Oneshot`;
                break;
            default:
                fileName = `${sanitizedTitle}-Chap-${savedChapters.number}`;
        }
    
        const uploadedUrls = await Promise.all(files.map(async (file, index) => {
            const pageFileName = `${fileName}-page-${index + 1}`;
            return await this.awsService.uploadFile(file, pageFileName);
        }));
        savedChapters.pagesUrl = uploadedUrls
    
        let notificationMessage = '';
        switch (chapterType) {
            case ChapterType.SPECIAL:
                notificationMessage = `Chapter Đặc Biệt của manga ${manga.title} vừa được cập nhật!`;
                break;
            case ChapterType.ONESHOT:
                notificationMessage = `OneShot của manga ${manga.title} vừa được cập nhật!`;
                break;
            default:
                notificationMessage = `Chapter ${savedChapters.number} của manga ${manga.title} vừa được cập nhật!`;
        }
    
        const followers = await this.userModel.find({
            followingManga: mangaId
        }).select('_id');
    
        if (followers.length > 0) {
            await this.notificationService.createNotification({
                type: NotificationType.NEW_CHAPTER,
                message: notificationMessage,
                recipients: followers.map(follower => follower._id),
                manga: manga._id,
                chapter: savedChapters._id
            });
        }
    
        return await savedChapters.save();
    }

    async updateChaptersInfo(updateInfoDTO: UpdateChaptersInfoDTO, chapterId: string, userId: string): Promise<Chapter> {
        const { number, chapterTitle, chapterType } = updateInfoDTO

        const chapter = await this.chaptersModel.findById(chapterId)
        if (!chapter) {
            throw new NotFoundException(`Chapter ${chapterId} not found`)
        }

        const user = await this.userModel.findById(userId)
        if (!user.uploadedManga.some(uploadedManga => uploadedManga.toString() === chapter.manga.toString())) {
            throw new ForbiddenException('Bạn không có quyền chỉnh sửa manga này')
        }

        if (number !== undefined) chapter.number = number;
        if (chapterTitle !== undefined) chapter.chapterTitle = chapterTitle;
        if (chapterType !== undefined) chapter.chapterType = chapterType;

        return await chapter.save()
    }

    async updatePageUrl (files: Express.Multer.File[], chapterId: string, userId: string): Promise<Chapter> {
        const chapter = await this.chaptersModel.findById(chapterId).populate('manga')
        if (!chapter) {
            throw new NotFoundException(`Chapter ${chapterId} not found`)
        }
    
        const manga = chapter.manga as any
    
        const user = await this.userModel.findById(userId)
        if (!user.uploadedManga.some(uploadedManga => uploadedManga.toString() === manga._id.toString())){
            throw new HttpException('CHAPTER.FORBIDDEN', HttpStatus.FORBIDDEN)
        }
    
        const sanitizedTitle = manga.title.replace(/[^\w\s]/g, '').replace(/\s+/g, '')
        let fileName = '';
        
        switch (chapter.chapterType) {
            case ChapterType.SPECIAL:
                fileName = `${sanitizedTitle}-Special`;
                break;
            case ChapterType.ONESHOT:
                fileName = `${sanitizedTitle}-Oneshot`;
                break;
            default:
                fileName = `${sanitizedTitle}-Chap-${chapter.number}`;
        }
    
        const uploadedUrls = await Promise.all(files.map(async (file, index) => {
            const pageFileName = `${fileName}-page-${index + 1}`;
            return await this.awsService.uploadFile(file, pageFileName);
        }));
        chapter.pagesUrl = uploadedUrls
    
        return await chapter.save()
    }

    async updateChapterView(chapterId: string): Promise<void> {
        const chapter = await this.chaptersModel.findById(chapterId);
        if (!chapter) {
            throw new NotFoundException(`Chapter ${chapterId} không tồn tại`);
        }
    
        const manga = await this.mangaModel.findById(chapter.manga);
        if (!manga) {
            throw new NotFoundException('Manga liên quan không tồn tại');
        }
    
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
    
        await Promise.all([
            this.viewLogModel.findOneAndUpdate(
                {
                    manga: manga._id,
                    date: today
                },
                {
                    $inc: { views: 1 },
                    $setOnInsert: { 
                        manga: manga._id,
                        date: today
                    }
                },
                { upsert: true }
            ),
    
            this.mangaModel.findByIdAndUpdate(
                manga._id,
                { $inc: { view: 1 } }
            ),
    
            this.chaptersModel.findByIdAndUpdate(
                chapterId,
                { $inc: { views: 1 } }
            )
        ]);
    }

    async generateChapterZip(chapterId: string): Promise<Buffer> {
        const chapter = await this.chaptersModel.findById(chapterId)
          .populate('manga', '_id title')
          .lean();
          
        if (!chapter) {
          throw new HttpException(`CHAPTER.NOT_FOUND`, HttpStatus.NOT_FOUND);
        }
      
        if (!chapter.pagesUrl) {
          throw new HttpException(`CHAPTER.NO_PAGES_URL`, HttpStatus.BAD_REQUEST);
        }
      
        const zip = new JSZip();
    
        const metadata = {
            id: chapter._id,
            mangaId: chapter.manga,
            number: chapter.number,
            title: chapter.chapterTitle,
            type: chapter.chapterType,
            totalPages: chapter.pagesUrl.length
        };
    
        const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2), 'utf8');
        zip.file('metadata.json', metadataBuffer);
    
        for (let i = 0; i < chapter.pagesUrl.length; i++) {
            const response = await axios.get(chapter.pagesUrl[i], {
                responseType: 'arraybuffer'
            });
            zip.file(`pages/${(i + 1).toString().padStart(3, '0')}.jpg`, response.data);
        }
      
        return zip.generateAsync({ 
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        });
    }
}
