export class HomeResponseDTO {
    dailyTop: {
        _id: string;
        title: string;
        coverImg: string;
        author: string;
        rating: number;
        view: number;
        viewToday: number;
    }[];

    weeklyTop: {
        _id: string;
        title: string;
        coverImg: string;
        author: string;
        rating: number;
        view: number;
        viewThisWeek: number;
    }[];

    recentUpdated: {
        _id: string;
        title: string;
        coverImg: string;
        author: string;
        rating: number;
        view: number;
        latestUpdate: Date;
    }[];

    randomManga: {
        _id: string;
        title: string;
        coverImg: string;
        author: string;
        rating: number;
        view: number;
    }[];
}