import { Comment } from "src/comment/schema/comment.schema";
import { Manga } from "src/manga/schemas/manga.schema"; 

export class UserProfileDTO {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    followers: FollowerDTO[];
    following: FollowingDTO[];
    uploadedManga: Manga[];
    favoritesManga: Manga[];
    dislikedManga: Manga[];
    followingManga: Manga[];
    readingHistory: Manga[];
    comments: Comment[];
    ratings: RatingDTO[];
}

export class FollowerDTO {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

export class FollowingDTO {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

export class RatingDTO {
    _id: string;
    user: UserInfoDTO;
    manga: MangaInfoDTO;
    score: number;
    createdAt: Date;
    updatedAt: Date;
}

export class UserInfoDTO {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

export class MangaInfoDTO {
    _id: string;
    title: string;
    author: string;
    coverImg?: string;
}

export class ChapterInfoDTO {
    _id: string;
    number: number;
    chapterTitle: string;
    chapterType: string;
}

export class ReadingHistoryDTO {
    manga: MangaInfoDTO;
    chapter: ChapterInfoDTO;
    updatedAt: Date;
}