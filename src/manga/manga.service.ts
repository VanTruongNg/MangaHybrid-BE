import { ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Manga, ViewLog } from './schemas/manga.schema';
import { Model } from 'mongoose';
import { CreateMangaDTO } from './dto/create-manga.dto';
import { AwsService } from 'src/aws/aws.service';
import { Genre } from 'src/genres/schemas/genre.schema';
import { User } from 'src/auth/schemas/user.schema';
import { ApprovalStatus } from './schemas/status.enum';

@Injectable()
export class MangaService {
    constructor(
        @InjectModel(Manga.name) private readonly mangaModel: Model<Manga>,
        @InjectModel(Genre.name) private readonly genreModel: Model<Genre>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(ViewLog.name) private readonly viewLogModel: Model<ViewLog>,
        private awsService: AwsService
    ) {}

    async findAll(): Promise<Manga[]> {
        return this.mangaModel.find({ approvalStatus: ApprovalStatus.APPROVED })
    }

    async findById(id: string): Promise<Manga> {
        const manga = await this.mangaModel.findById(id).populate('genre', 'name')
                                                        .populate({ path: 'uploader', select: 'name avatarUrl'})
                                                        .populate({ path: 'chapters', select: 'chapterName chapterTitle views number', options: { sort: { number: 1 }}})
        if (!manga) {
            throw new NotFoundException(`Không tồn tại Manga có ID: ${id}`)
        }

        return manga    
    }

    async findTopMangaByViewsToday(): Promise<Manga[]> {
        const today = new Date()
        today.setUTCHours(0,0,0,0)

        const viewLogs = await this.viewLogModel.find({
            date: today
        }).sort({
            views: -1
        }).populate('manga').lean()

        if (!viewLogs.length) {
            return await this.mangaModel.find().sort({ view: -1 })
        }

        return viewLogs.map(log => log.manga)
    }

    async findTopMangaByViewsThisWeek(): Promise<Manga[]> {
        const now = new Date()

        const startOfWeek = new Date(now)
        const dayOfWeek = startOfWeek.getUTCDay()

        const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek
        startOfWeek.setUTCDate(startOfWeek.getUTCDate() + diffToMonday)
        startOfWeek.setUTCHours(0,0,0,0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6)
        endOfWeek.setUTCHours(23,59,59,999)

        const viewLogs = await this.viewLogModel.aggregate([
            {
                $match: {
                    date: { $gte: startOfWeek, $lte: endOfWeek }
                }
            },
            {
                $group: {
                    _id: '$manga',
                    totalViews: { $sum: "$views" }
                }
            },
            {
                $sort: {
                    totalViews: -1
                }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'mangas',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'mangaDetails'
                }
            },
            {
                $unwind: '$mangaDetails'
            },
            {
                $replaceRoot: {
                    newRoot: '$mangaDetails'
                }
            }
        ])

        return viewLogs
    }
    
    async createManga (uploader: string, createMangaDTO: CreateMangaDTO, file: Express.Multer.File): Promise<Manga> {
        const { genre, ...mangaData } = createMangaDTO

        if (genre && genre.length > 0 ) {
            const genres = await this.genreModel.find({'_id': { $in: genre }})
            const genreIds = genres.map(g => g._id.toString())
            const invalidGenres = genre.filter(id => !genreIds.includes(id.toString()))

            if (invalidGenres.length > 0) {
                throw new NotFoundException (`Thể loại không tồn tại: ${invalidGenres.join(', ')}`)
            }
        }

        const user = await this.userModel.findById(uploader)

        if (!user) {
            throw new NotFoundException (`Không tìm thấy Uploader có ID: ${uploader}`)
        }

        const newManga = new this.mangaModel({...mangaData, genre, uploader})
        const savedManga = await newManga.save()

        if (genre && genre.length > 0) {
            await this.genreModel.updateMany(
                { _id: { $in: genre } },
                { $addToSet: { manga: savedManga._id } }
            );
        }
        
        user.uploadedManga.push(savedManga)

        await user.save()

        const sanitizedTitle = savedManga.title.replace(/[^\w\s]/g, '').replace(/\s+/g, '')
        const fileName = `${savedManga._id.toString()}-${sanitizedTitle}`
        try {
            const coverImgUrl = await this.awsService.uploadFile(file, fileName)
            savedManga.coverImg = coverImgUrl
            return await savedManga.save()
        } catch (error) {
            throw new InternalServerErrorException(`Upload file thất bại: ${error.message}`)
        }
    }

    async rejectMangaById (mangaId: string, reason: string): Promise<void> {
        try {
            const manga = await this.mangaModel.findById(mangaId)
            if (!manga) {
                throw new NotFoundException (`Manga ${mangaId} không tồn tại!`)
            }

            manga.approvalStatus = ApprovalStatus.REJECTED
            manga.rejectReason = reason

            await manga.save()
        } catch (error) {
            throw new InternalServerErrorException(`Xảy ra lỗi khi phê duyệt: ${error.message}`)
        }
    }

    async approveMangaById (mangaId: string): Promise<void> {
        try {
            const manga = await this.mangaModel.findById(mangaId)
            if (!manga) {
                throw new NotFoundException(`Manga ${mangaId} không tồn tại`);
            }

            if (manga.approvalStatus === ApprovalStatus.REJECTED) {
                throw new ConflictException(`Manga ${mangaId} đã bị từ chối`)
            }

            manga.approvalStatus === ApprovalStatus.APPROVED
            await manga.save()
        } catch (error) {
            throw new InternalServerErrorException(`Xảy ra lỗi khi phê duyệt: ${error.message}`)
        }
    }

    async resubmitMangaById (mangaId: string): Promise<void> {
        const manga = await this.mangaModel.findById(mangaId)
        if (!manga) {
            throw new NotFoundException(`Manga ${mangaId} không tồn tại`);
        }

        if (manga.approvalStatus !== ApprovalStatus.REJECTED) {
            throw new ConflictException(`Manga với ID ${mangaId} không ở trạng thái bị từ chối`);
        }

        manga.approvalStatus = ApprovalStatus.PENDING
        await manga.save()
    }

    async updateCoverImg (mangaId: string, file: Express.Multer.File, userId: string): Promise<Manga> {
        const manga = await this.mangaModel.findById(mangaId)
        
        if (!manga) {
            throw new NotFoundException(`Manga với ID: ${mangaId} không tồn tại`)
        }
        if (manga.uploader.toString() !== userId) {
            throw new ForbiddenException('Bạn không phải là người upload Manga này!')
        }
        if (manga.approvalStatus !== ApprovalStatus.APPROVED) {
            throw new ConflictException (`Manga ${mangaId} chưa được duyệt`)
        }

        const sanitizedTitle = manga.title.replace(/[^\w\s]/g, '').replace(/\s+/g, '')
        const fileName = `${manga._id.toString()}-${sanitizedTitle}`

        const coverImg = await this.awsService.uploadFile(file, fileName)

        manga.coverImg = coverImg
        return await manga.save()
    }
}
