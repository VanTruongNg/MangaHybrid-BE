import { IsString } from 'class-validator';

export class UpdateReadingHistoryDTO {
    @IsString()
    chapterId: string;
}