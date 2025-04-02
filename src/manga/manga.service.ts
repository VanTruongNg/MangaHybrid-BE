import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Manga, ViewLog } from './schemas/manga.schema';
import { Model } from 'mongoose';
import { CreateMangaDTO } from './dto/create-manga.dto';
import { AwsService } from 'src/aws/aws.service';
import { Genre } from 'src/genres/schemas/genre.schema';
import { User } from 'src/auth/schemas/user.schema';
import { ApprovalStatus } from './schemas/status.enum';
import * as sharp from 'sharp';
import * as mongoose from 'mongoose';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/schema/notification.schema';

interface PaginatedResult<T> {
    mangas: T[];
    total: number;
    page: number;
    totalPages: number;
}

@Injectable()
export class MangaService {
    constructor(
        @InjectModel(Manga.name) private readonly mangaModel: Model<Manga>,
        @InjectModel(Genre.name) private readonly genreModel: Model<Genre>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(ViewLog.name) private readonly viewLogModel: Model<ViewLog>,
        private awsService: AwsService,
        private notificationService: NotificationService
    ) {}

    async findAll(): Promise<Manga[]> {
        return this.mangaModel.find({ approvalStatus: ApprovalStatus.APPROVED })
    }

    async findById(id: string): Promise<Manga> {
        try {
            const manga = await this.mangaModel
                .findById(id)
                .populate([
                    {
                        path: 'uploader',
                        select: '_id name email avatarUrl'
                    },
                    {
                        path: 'chapters',
                        select: '_id chapterTitle chapterName views createdAt'
                    },
                    {
                        path: 'genre',
                        select: '_id name'
                    },
                    {
                        path: 'comments',
                        match: { parentComment: null },
                        select: '_id content createdAt',
                        populate: [
                            {
                                path: 'user',
                                select: '_id name avatarUrl'
                            },
                            {
                                path: 'replies',
                                select: '_id'
                            }
                        ]
                    }
                ])
                .select('-__v')
                .lean();
    
            if (!manga) {
                throw new NotFoundException('MANGA.NOT_FOUND');
            }
    
            manga.like = Number(manga.like) || 0;
            manga.disLike = Number(manga.disLike) || 0;
            manga.followers = Number(manga.followers) || 0;
            manga.view = Number(manga.view) || 0;
            manga.rating = Number(manga.rating) || 0;
            manga.totalRating = Number(manga.totalRating) || 0;
            manga.ratingCount = Number(manga.ratingCount) || 0;
            manga.averageRating = Number(manga.averageRating) || 0;
    
            return manga;
        } catch (error) {
            if (error.name === 'CastError') {
                throw new NotFoundException('MANGA.NOT_FOUND');
            }
            throw error;
        }
    }

    async findTopMangaByViewsToday(page: number, limit: number): Promise<PaginatedResult<Manga>> {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const hasViewsToday = await this.viewLogModel.exists({
            date: { 
                $gte: today,
                $lte: new Date()
            }
        });

        if (hasViewsToday) {
            const [mangas, total] = await Promise.all([
                this.viewLogModel.aggregate([
                    {
                        $match: {
                            date: { 
                                $gte: today,
                                $lte: new Date()
                            }
                        }
                    },
                    {
                        $group: {
                            _id: '$manga',
                            dailyViews: {
                                $sum: '$views'
                            }
                        }
                    },
                    {
                        $sort: { 
                            dailyViews: -1
                        }
                    },
                    {
                        $skip: (page - 1) * limit
                    },
                    {
                        $limit: limit
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
                        $lookup: {
                            from: 'chapters',
                            localField: 'mangaDetails.chapters',
                            foreignField: '_id',
                            as: 'chapterDetails'
                        }
                    },
                    {
                        $addFields: {
                            latestChapter: { $max: '$chapterDetails.createdAt' },
                            chapterName: {
                                $getField: {
                                    field: 'chapterName',
                                    input: {
                                        $first: {
                                            $filter: {
                                                input: '$chapterDetails',
                                                cond: { 
                                                    $eq: ['$$this.createdAt', { $max: '$chapterDetails.createdAt' }] 
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: '$mangaDetails._id',
                            title: '$mangaDetails.title',
                            description: '$mangaDetails.description',
                            coverImg: '$mangaDetails.coverImg',
                            bannerImg: '$mangaDetails.bannerImg',
                            author: '$mangaDetails.author',
                            rating: '$mangaDetails.rating',
                            view: '$mangaDetails.view',
                            dailyView: '$dailyViews',
                            latestUpdate: '$latestChapter',
                            chapterName: 1
                        }
                    }
                ]),
                this.viewLogModel.aggregate([
                    {
                        $match: {
                            date: { 
                                $gte: today,
                                $lte: new Date()
                            }
                        }
                    },
                    {
                        $group: {
                            _id: '$manga'
                        }
                    },
                    {
                        $count: 'total'
                    }
                ]).then(result => result[0]?.total || 0)
            ]);

            return {
                mangas,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };
        }

        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const [mangas, total] = await Promise.all([
            this.viewLogModel.aggregate([
                {
                    $match: {
                        date: yesterday
                    }
                },
                {
                    $group: {
                        _id: '$manga',
                        dailyViews: {
                            $sum: '$views'
                        }
                    }
                },
                {
                    $sort: { 
                        dailyViews: -1
                    }
                },
                {
                    $skip: (page - 1) * limit
                },
                {
                    $limit: limit
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
                    $lookup: {
                        from: 'chapters',
                        localField: 'mangaDetails.chapters',
                        foreignField: '_id',
                        as: 'chapterDetails'
                    }
                },
                {
                    $addFields: {
                        latestChapter: { $max: '$chapterDetails.createdAt' },
                        chapterName: {
                            $getField: {
                                field: 'chapterName',
                                input: {
                                    $first: {
                                        $filter: {
                                            input: '$chapterDetails',
                                            cond: { 
                                                $eq: ['$$this.createdAt', { $max: '$chapterDetails.createdAt' }] 
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: '$mangaDetails._id',
                        title: '$mangaDetails.title',
                        description: '$mangaDetails.description',
                        coverImg: '$mangaDetails.coverImg',
                        bannerImg: '$mangaDetails.bannerImg',
                        author: '$mangaDetails.author',
                        rating: '$mangaDetails.rating',
                        view: '$mangaDetails.view',
                        dailyView: '$dailyViews',
                        latestUpdate: '$latestChapter',
                        chapterName: 1
                    }
                }
            ]),
            this.viewLogModel.aggregate([
                {
                    $match: {
                        date: yesterday
                    }
                },
                {
                    $group: {
                        _id: '$manga'
                    }
                },
                {
                    $count: 'total'
                }
            ]).then(result => result[0]?.total || 0)
        ]);

        if (total === 0) {
            return this.findTopMangaByTotalViews(page, limit);
        }

        return {
            mangas,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findTopMangaByViewsThisWeek(page: number, limit: number): Promise<{
        mangas: Manga[],
        total: number,
        page: number,
        totalPages: number
    }> {
        const now = new Date()
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        sevenDaysAgo.setHours(0, 0, 0, 0)

        const [mangas, total] = await Promise.all([
            this.viewLogModel.aggregate([
                {
                    $match: {
                        date: { 
                            $gte: sevenDaysAgo,
                            $lte: now
                        }
                    }
                },
                {
                    $group: {
                        _id: '$manga',
                        weeklyViews: {
                            $sum: '$views'
                        }
                    }
                },
                {
                    $sort: { 
                        weeklyViews: -1
                    }
                },
                {
                    $skip: (page - 1) * limit
                },
                {
                    $limit: limit
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
                    $lookup: {
                        from: 'chapters',
                        localField: 'mangaDetails.chapters',
                        foreignField: '_id',
                        as: 'chapterDetails'
                    }
                },
                {
                    $addFields: {
                        latestChapter: { $max: '$chapterDetails.createdAt' },
                        chapterName: {
                            $getField: {
                                field: 'chapterName',
                                input: {
                                    $first: {
                                        $filter: {
                                            input: '$chapterDetails',
                                            cond: { 
                                                $eq: ['$$this.createdAt', { $max: '$chapterDetails.createdAt' }] 
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: '$mangaDetails._id',
                        title: '$mangaDetails.title',
                        description: '$mangaDetails.description',
                        coverImg: '$mangaDetails.coverImg',
                        bannerImg: '$mangaDetails.bannerImg',
                        author: '$mangaDetails.author',
                        rating: '$mangaDetails.rating',
                        view: '$mangaDetails.view',
                        weeklyView: '$weeklyViews',
                        latestUpdate: '$latestChapter',
                        chapterName: 1
                    }
                }
            ]),
            this.viewLogModel.countDocuments({
                date: { 
                    $gte: sevenDaysAgo,
                    $lte: now
                }
            })
        ]);

        return {
            mangas,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findRecentlyUpdated(page: number, limit: number): Promise<{
        mangas: Manga[],
        total: number,
        page: number,
        totalPages: number
    }> {
        const skip = (page - 1) * limit;

        const [mangas, total] = await Promise.all([
            this.mangaModel.aggregate([
                {
                    $match: { 
                        approvalStatus: ApprovalStatus.APPROVED,
                        chapters: { $exists: true, $ne: [] }
                    }
                },
                {
                    $lookup: {
                        from: 'chapters',
                        localField: 'chapters',
                        foreignField: '_id',
                        as: 'chapterDetails'
                    }
                },
                {
                    $addFields: {
                        latestChapter: { $max: '$chapterDetails.createdAt' },
                        chapterName: {
                            $getField: {
                                field: 'chapterName',
                                input: {
                                    $first: {
                                        $filter: {
                                            input: '$chapterDetails',
                                            cond: { 
                                                $eq: ['$$this.createdAt', { $max: '$chapterDetails.createdAt' }] 
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $sort: { latestChapter: -1 }
                },
                {
                    $skip: skip
                },
                {
                    $limit: limit
                },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        coverImg: 1,
                        bannerImg: 1,
                        author: 1,
                        rating: 1,
                        view: 1,
                        latestUpdate: '$latestChapter',
                        chapterName: 1
                    }
                }
            ]),
            this.mangaModel.aggregate([
                {
                    $match: { 
                        approvalStatus: ApprovalStatus.APPROVED,
                        chapters: { $exists: true, $ne: [] }
                    }
                },
                {
                    $count: 'total'
                }
            ]).then(result => result[0]?.total || 0)
        ]);

        return {
            mangas,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findRandomManga(limit: number = 24): Promise<Manga[]> {
        return this.mangaModel.aggregate([
            {
                $match: { 
                    approvalStatus: ApprovalStatus.APPROVED 
                }
            },
            { 
                $sample: { size: limit } 
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    coverImg: 1,
                    bannerImg: 1,
                    author: 1,
                    rating: 1,
                    view: 1
                }
            }
        ]);
    }
    
    async createManga(uploader: string, createMangaDTO: CreateMangaDTO, files: { cover: Express.Multer.File, banner: Express.Multer.File }): Promise<Manga> {
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

        const newManga = new this.mangaModel({
            ...mangaData, 
            genre, 
            uploader,
            approvalStatus: user.role === 'admin' ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING
        })
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
        
        try {
            const resizedCover = await sharp(files.cover.buffer)
                .resize(600, 800, { 
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .jpeg({ quality: 80 })
                .toBuffer();

            const resizedBanner = await sharp(files.banner.buffer)
                .resize(1920, 1080, { 
                    fit: 'cover'
                })
                .jpeg({ quality: 80 })
                .toBuffer();

            const coverFileName = `cover-${savedManga._id.toString()}-${sanitizedTitle}`;
            const coverImgUrl = await this.awsService.uploadFile({
                ...files.cover,
                buffer: resizedCover
            }, coverFileName);
            savedManga.coverImg = coverImgUrl;

            const bannerFileName = `banner-${savedManga._id.toString()}-${sanitizedTitle}`;
            const bannerImgUrl = await this.awsService.uploadFile({
                ...files.banner,
                buffer: resizedBanner
            }, bannerFileName);
            savedManga.bannerImg = bannerImgUrl;

            const finalManga = await savedManga.save();

            if (finalManga.approvalStatus === ApprovalStatus.PENDING) {
                const admins = await this.userModel.find({ role: 'admin' });
                if (admins.length > 0) {
                    await this.notificationService.createNotification({
                        type: NotificationType.NEW_MANGA_PENDING,
                        message: `Manga mới "${finalManga.title}" đang chờ duyệt`,
                        recipients: admins.map(admin => admin._id),
                        manga: finalManga._id
                    });
                }
            }

            return finalManga;
        } catch (error) {
            throw new InternalServerErrorException(`Upload file thất bại: ${error.message}`);
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

            manga.approvalStatus = ApprovalStatus.APPROVED
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
        if (manga.uploader.toString() !== userId.toString()) {
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

    async updateBannerImg(mangaId: string, file: Express.Multer.File, userId: string): Promise<Manga> {
        const manga = await this.mangaModel.findById(mangaId)
        
        if (!manga) {
            throw new NotFoundException(`Manga với ID: ${mangaId} không tồn tại`)
        }
        if (manga.uploader.toString() !== userId.toString()) {
            throw new ForbiddenException('Bạn không phải là người upload Manga này!')
        }
        if (manga.approvalStatus !== ApprovalStatus.APPROVED) {
            throw new ConflictException(`Manga ${mangaId} chưa được duyệt`)
        }

        try {
            // Resize banner image
            const resizedBanner = await sharp(file.buffer)
                .resize(1920, 1080, { // Thay đổi kích thước banner
                    fit: 'cover'
                })
                .jpeg({ quality: 80 })
                .toBuffer();

            const sanitizedTitle = manga.title.replace(/[^\w\s]/g, '').replace(/\s+/g, '');
            const fileName = `banner-${manga._id.toString()}-${sanitizedTitle}`;

            const bannerImg = await this.awsService.uploadFile({
                ...file,
                buffer: resizedBanner
            }, fileName);

            manga.bannerImg = bannerImg;
            return await manga.save();
        } catch (error) {
            throw new InternalServerErrorException(`Upload file thất bại: ${error.message}`);
        }
    }

    async findTopMangaByTotalViews(page: number, limit: number): Promise<{
        mangas: Manga[],
        total: number,
        page: number,
        totalPages: number
    }> {
        const skip = (page - 1) * limit;

        const [mangas, total] = await Promise.all([
            this.mangaModel.aggregate([
                {
                    $match: { 
                        approvalStatus: ApprovalStatus.APPROVED 
                    }
                },
                {
                    $lookup: {
                        from: 'viewlogs',
                        localField: '_id',
                        foreignField: 'manga',
                        as: 'viewLogs'
                    }
                },
                {
                    $addFields: {
                        totalViews: {
                            $sum: '$viewLogs.views'
                        }
                    }
                },
                {
                    $sort: { 
                        totalViews: -1 
                    }
                },
                {
                    $skip: skip
                },
                {
                    $limit: limit
                },
                {
                    $lookup: {
                        from: 'chapters',
                        localField: 'chapters',
                        foreignField: '_id',
                        as: 'chapterDetails'
                    }
                },
                {
                    $addFields: {
                        latestChapter: { $max: '$chapterDetails.createdAt' },
                        chapterName: {
                            $getField: {
                                field: 'chapterName',
                                input: {
                                    $first: {
                                        $filter: {
                                            input: '$chapterDetails',
                                            cond: { 
                                                $eq: ['$$this.createdAt', { $max: '$chapterDetails.createdAt' }] 
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        coverImg: 1,
                        bannerImg: 1,
                        author: 1,
                        rating: 1,
                        view: '$totalViews',
                        latestUpdate: '$latestChapter',
                        chapterName: 1
                    }
                }
            ]),
            this.mangaModel.aggregate([
                {
                    $match: { 
                        approvalStatus: ApprovalStatus.APPROVED 
                    }
                },
                {
                    $count: 'total'
                }
            ]).then(result => result[0]?.total || 0)
        ]);

        return {
            mangas,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findTopMangaByViewsThisMonth(page: number, limit: number): Promise<{
        mangas: Manga[],
        total: number,
        page: number,
        totalPages: number
    }> {
        const now = new Date()
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        thirtyDaysAgo.setHours(0, 0, 0, 0)

        const [mangas, total] = await Promise.all([
            this.viewLogModel.aggregate([
                {
                    $match: {
                        date: { 
                            $gte: thirtyDaysAgo,
                            $lte: now
                        }
                    }
                },
                {
                    $group: {
                        _id: '$manga',
                        monthlyViews: {
                            $sum: '$views'
                        }
                    }
                },
                {
                    $sort: { 
                        monthlyViews: -1
                    }
                },
                {
                    $skip: (page - 1) * limit
                },
                {
                    $limit: limit
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
                    $lookup: {
                        from: 'chapters',
                        localField: 'mangaDetails.chapters',
                        foreignField: '_id',
                        as: 'chapterDetails'
                    }
                },
                {
                    $addFields: {
                        latestChapter: { $max: '$chapterDetails.createdAt' },
                        chapterName: {
                            $getField: {
                                field: 'chapterName',
                                input: {
                                    $first: {
                                        $filter: {
                                            input: '$chapterDetails',
                                            cond: { 
                                                $eq: ['$$this.createdAt', { $max: '$chapterDetails.createdAt' }] 
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: '$mangaDetails._id',
                        title: '$mangaDetails.title',
                        description: '$mangaDetails.description',
                        coverImg: '$mangaDetails.coverImg',
                        bannerImg: '$mangaDetails.bannerImg',
                        author: '$mangaDetails.author',
                        rating: '$mangaDetails.rating',
                        view: '$mangaDetails.view',
                        monthlyView: '$monthlyViews',
                        latestUpdate: '$latestChapter',
                        chapterName: 1
                    }
                }
            ]),
            this.viewLogModel.countDocuments({
                date: { 
                    $gte: thirtyDaysAgo,
                    $lte: now
                }
            })
        ]);

        return {
            mangas,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getMangaByUploader(uploaderId: string): Promise<{
        mangas: Manga[],
        totalManga: number
    }> {
        const uploader = await this.userModel.findById(uploaderId)
        if (!uploader) {
            throw new HttpException(`Uploader với ID: ${uploaderId} không tồn tại`, HttpStatus.NOT_FOUND)
        }

        const [mangas, totalManga] = await Promise.all([
            this.mangaModel.aggregate([
                {
                    $match: { 
                        uploader: new mongoose.Types.ObjectId(uploaderId)
                    }
                },
                {
                    $lookup: {
                        from: 'chapters',
                        localField: 'chapters',
                        foreignField: '_id',
                        as: 'chapters'
                    }
                },
                {
                    $addFields: {
                        latestChapterDate: {
                            $max: '$chapters.createdAt'
                        }
                    }
                },
                {
                    $sort: {
                        latestChapterDate: -1
                    }
                },
                {
                    $limit: 5
                },
                {
                    $addFields: {
                        chapters: {
                            $slice: [
                                { $sortArray: { input: '$chapters', sortBy: { createdAt: -1 } } },
                                1
                            ]
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        coverImg: 1,
                        chapters: {
                            $map: {
                                input: '$chapters',
                                as: 'chapter',
                                in: {
                                    _id: '$$chapter._id',
                                    chapterName: '$$chapter.chapterName',
                                    createdAt: '$$chapter.createdAt'
                                }
                            }
                        }
                    }
                }
            ]),
            this.mangaModel.countDocuments({ 
                uploader: new mongoose.Types.ObjectId(uploaderId)
            })
        ]);

        return {
            mangas,
            totalManga
        };
    }

    async getPendingMangas(page: number = 1, limit: number = 10): Promise<{
        mangas: Manga[],
        total: number,
        page: number,
        totalPages: number
    }> {
        const skip = (page - 1) * limit;

        const [mangas, total] = await Promise.all([
            this.mangaModel.find({ approvalStatus: ApprovalStatus.PENDING })
                .populate([
                    {
                        path: 'uploader',
                        select: '_id name email'
                    },
                    {
                        path: 'genre',
                        select: '_id name'
                    }
                ])
                .select('_id title description coverImg bannerImg author genre uploader createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.mangaModel.countDocuments({ approvalStatus: ApprovalStatus.PENDING })
        ]);

        return {
            mangas,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async deleteManga(mangaId: string, userId: string): Promise<void> {
        try {
            const mangaObjectId = new mongoose.Types.ObjectId(mangaId);
            const userObjectId = new mongoose.Types.ObjectId(userId);

            const [manga, user] = await Promise.all([
                this.mangaModel.findById(mangaObjectId)
                    .populate('uploader'),
                this.userModel.findById(userObjectId)
                    .select('role')
            ]);
            
            if (!manga) {
                throw new NotFoundException(`Manga với ID: ${mangaId} không tồn tại`);
            }

            if (!user) {
                throw new NotFoundException(`User với ID: ${userId} không tồn tại`);
            }

            const isAdmin = user.role === 'admin';
            const isUploader = manga.uploader.toString() === userId;

            if (!isAdmin || !isUploader) {
                throw new ForbiddenException('Bạn không có quyền xóa manga này!');
            }

            if (manga.genre && manga.genre.length > 0) {
                await this.genreModel.updateMany(
                    { _id: { $in: manga.genre } },
                    { $pull: { manga: mangaObjectId } }
                );
            }

            await this.userModel.updateMany(
                {},
                {
                    $pull: {
                        uploadedManga: mangaObjectId,
                        favoritesManga: mangaObjectId,
                        dislikedManga: mangaObjectId,
                        followingManga: mangaObjectId,
                        'readingHistory.manga': mangaObjectId
                    }
                }
            );

            await Promise.all([
                this.viewLogModel.deleteMany({ manga: mangaObjectId }),
                this.mangaModel.findByIdAndDelete(mangaObjectId)
            ]);

            

        } catch (error) {
            if (error.name === 'CastError') {
                throw new BadRequestException('ID không hợp lệ');
            }
            throw new InternalServerErrorException(`Xóa manga thất bại: ${error.message}`);
        }
    }
}
