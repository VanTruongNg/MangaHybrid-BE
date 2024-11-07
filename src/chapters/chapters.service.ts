import {  ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Manga, ViewLog } from 'src/manga/schemas/manga.schema';
import { CreateChapterDTO } from './dto/create-chapter.dto';
import { AwsService } from 'src/aws/aws.service';
import { Chapter } from './schemas/chapter.shema';
import { UpdateChaptersInfoDTO } from './dto/update-info.dto';
import { User } from 'src/auth/schemas/user.schema';
import { ApprovalStatus } from 'src/manga/schemas/status.enum';

@Injectable()
export class ChaptersService {
    constructor (
        @InjectModel(Manga.name) private readonly mangaModel: Model<Manga>,
        @InjectModel(Chapter.name) private readonly chaptersModel: Model<Chapter>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(ViewLog.name) private readonly viewLogModel: Model<ViewLog>,
        private readonly awsService: AwsService
    ) {}

    async getAll(): Promise<Chapter[]> {
        return this.chaptersModel.find();
    }

    async getChapterById(id: string): Promise<Chapter> {
        return this.chaptersModel.findById(id).populate('manga', 'title').lean()
    }
    async createChaptersByManga(mangaId: string, createChapterDTO: CreateChapterDTO, files: Express.Multer.File[], userId: string): Promise<Chapter> {
        const { ...chapterData} = createChapterDTO
    
        const manga = await this.mangaModel.findById(mangaId)
            .populate({
                path: 'followers',
                select: '_id'
            })
            
        if (!manga) {
            throw new NotFoundException(`Manga có ID: ${mangaId} không tồn tại`)
        }
    
        if (manga.uploader.toString() !== userId) {
            throw new ForbiddenException("Bạn không có quyền thêm Chapter cho Manga này")
        }
    
        if (manga.approvalStatus !== ApprovalStatus.APPROVED) {
            throw new ConflictException(`'Manga ${mangaId} chưa được phê duyệt.`)
        }
        
        const newChapters = new this.chaptersModel({...chapterData, manga: mangaId})
        const savedChapters = await newChapters.save()
    
        manga.chapters.push(savedChapters)
        await manga.save()
    
        const sanitizedTitle = manga.title.replace(/[^\w\s]/g, '').replace(/\s+/g, '')
        const fileName = `${sanitizedTitle}-Chap-${savedChapters.number}`;
    
        const uploadedUrls = await this.awsService.uploadMultiFile(files, fileName)
        savedChapters.pagesUrl = uploadedUrls
    
        return savedChapters;
    }

    async updateChaptersInfo(updateInfoDTO: UpdateChaptersInfoDTO, chapterId: string, userId: string): Promise<Chapter> {

        const { number, chapterTitle } = updateInfoDTO

        const chapter = await this.chaptersModel.findById(chapterId)
        if (!chapter) {
            throw new NotFoundException(`Chapter ${chapterId} not found`)
        }

        const user = await this.userModel.findById(userId)
        if (!user.uploadedManga.some(uploadedManga => uploadedManga.toString() === chapter.manga.toString())) {
            throw new ForbiddenException('Bạn không có quyền chỉnh sửa manga này')
        }

        chapter.number = number
        chapter.chapterTitle = chapterTitle

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
            throw new ForbiddenException ("Bạn không có quyền cập nhật Chapter này")
        }

        const sanitizedTitle = manga.title.replace(/[^\w\s]/g, '').replace(/\s+/g, '')
        const fileName = `${sanitizedTitle}-Chap-${chapter.number}`

        const uploadedUrls = await this.awsService.uploadMultiFile(files, fileName)
        chapter.pagesUrl = uploadedUrls

        return await chapter.save()
    }

    async updateChapterView (chapterId: string): Promise<void> {
        const chapter = await this.chaptersModel.findById(chapterId)
        if (!chapter) {
            throw new NotFoundException(`Chapter ${chapterId} không tồn tại`)
        }

        const manga = await this.mangaModel.findById(chapter.manga)
        if (!manga) {
            throw new NotFoundException('Manga liên quan không tồn tại')
        }

        const today = new Date()
        today.setUTCHours(0,0,0,0)

        let viewLog = await this.viewLogModel.findOne({
            manga: manga._id,
            date: today
        })

        if (!viewLog) {
            viewLog = new this.viewLogModel({
                manga: manga._id,
                date: today,
                views: 0
            })
        }

        viewLog.views = (viewLog.views || 0) + 1
        await viewLog.save()

        manga.view = (manga.view || 0) + 1;
        chapter.views = (chapter.views || 0) + 1
        await manga.save()
        await chapter.save()
    }
}
