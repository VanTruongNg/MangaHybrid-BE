import { IsString } from 'class-validator';

export class UpdateReadingHistoryDTO {
    @IsString()
    mangaId: string;

    @IsString()
    chapterId: string;
}