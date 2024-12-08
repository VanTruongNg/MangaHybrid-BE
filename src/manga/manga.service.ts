import { ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Manga, ViewLog } from './schemas/manga.schema';
import { Model } from 'mongoose';
import { CreateMangaDTO } from './dto/create-manga.dto';
import { AwsService } from 'src/aws/aws.service';
import { Genre } from 'src/genres/schemas/genre.schema';
import { User } from 'src/auth/schemas/user.schema';
import { ApprovalStatus } from './schemas/status.enum';
import * as sharp from 'sharp';

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
        private awsService: AwsService
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
        const skip = (page - 1) * limit;
        const today = new Date()
        today.setUTCHours(0,0,0,0)

        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const total = await this.viewLogModel.aggregate([
            {
                $match: {
                    date: { 
                        $gte: yesterday,
                        $lte: today 
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
        ]).then(result => result[0]?.total || 0);

        if (total === 0) {
            return {
                mangas: [],
                total: 0,
                page,
                totalPages: 0
            };
        }

        const mangas = await this.viewLogModel.aggregate([
            {
                $match: {
                    date: { 
                        $gte: yesterday,
                        $lte: today 
                    }
                }
            },
            {
                $group: {
                    _id: '$manga',
                    viewToday: {
                        $sum: {
                            $cond: [
                                { $eq: ['$date', today] },
                                '$views',
                                0
                            ]
                        }
                    },
                    viewYesterday: {
                        $sum: {
                            $cond: [
                                { $eq: ['$date', yesterday] },
                                '$views',
                                0
                            ]
                        }
                    }
                }
            },
            {
                $addFields: {
                    effectiveViews: {
                        $cond: [
                            { $gt: ['$viewToday', 0] },
                            '$viewToday',
                            '$viewYesterday'
                        ]
                    }
                }
            },
            {
                $sort: { 
                    effectiveViews: -1
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
                $project: {
                    _id: '$mangaDetails._id',
                    title: '$mangaDetails.title',
                    description: '$mangaDetails.description', 
                    coverImg: '$mangaDetails.coverImg',
                    bannerImg: '$mangaDetails.bannerImg',
                    author: '$mangaDetails.author',
                    rating: '$mangaDetails.rating',
                    view: '$mangaDetails.view',
                    dailyView: '$effectiveViews'
                }
            }
        ]);

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
        
        // Lấy ngày đầu tuần này (thứ 2)
        const startOfThisWeek = new Date(now)
        startOfThisWeek.setUTCDate(now.getUTCDate() - now.getUTCDay() + 1)
        startOfThisWeek.setUTCHours(0,0,0,0)
        
        // Lấy ngày đầu tuần trước
        const startOfLastWeek = new Date(startOfThisWeek)
        startOfLastWeek.setUTCDate(startOfLastWeek.getUTCDate() - 7)

        const skip = (page - 1) * limit;

        const [mangas, total] = await Promise.all([
            this.viewLogModel.aggregate([
                {
                    $match: {
                        date: { 
                            $gte: startOfLastWeek,
                            $lte: now 
                        }
                    }
                },
                {
                    $group: {
                        _id: '$manga',
                        viewThisWeek: {
                            $sum: {
                                $cond: [
                                    { $gte: ['$date', startOfThisWeek] },
                                    '$views',
                                    0
                                ]
                            }
                        },
                        viewLastWeek: {
                            $sum: {
                                $cond: [
                                    { 
                                        $and: [
                                            { $gte: ['$date', startOfLastWeek] },
                                            { $lt: ['$date', startOfThisWeek] }
                                        ]
                                    },
                                    '$views',
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $sort: { 
                        viewThisWeek: -1,
                        viewLastWeek: -1  
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
                    $project: {
                        _id: '$mangaDetails._id',
                        title: '$mangaDetails.title',
                        description: '$mangaDetails.description',
                        coverImg: '$mangaDetails.coverImg',
                        bannerImg: '$mangaDetails.bannerImg',
                        author: '$mangaDetails.author',
                        rating: '$mangaDetails.rating',
                        view: '$mangaDetails.view',
                        viewThisWeek: 1,
                        viewLastWeek: 1
                    }
                }
            ]),
            this.viewLogModel.aggregate([
                {
                    $match: {
                        date: { 
                            $gte: startOfLastWeek,
                            $lte: now 
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
                        latestChapter: { $max: '$chapterDetails.createdAt' }
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
                        latestUpdate: '$latestChapter'
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
        
        try {
            // Resize cover image
            const resizedCover = await sharp(files.cover.buffer)
                .resize(600, 800, { // Thay đổi kích thước cover
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .jpeg({ quality: 80 })
                .toBuffer();

            // Resize banner image
            const resizedBanner = await sharp(files.banner.buffer)
                .resize(1920, 1080, { // Thay đổi kích thước banner
                    fit: 'cover'
                })
                .jpeg({ quality: 80 })
                .toBuffer();

            // Upload resized images
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

            return await savedManga.save();
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
                    $project: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        coverImg: 1,
                        bannerImg: 1,
                        author: 1,
                        rating: 1,
                        view: '$totalViews'
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
}
