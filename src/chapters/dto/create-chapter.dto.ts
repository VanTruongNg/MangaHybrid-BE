import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ChapterType } from "../schemas/chapter.shema";

export class CreateChapterDTO {
    @IsNotEmpty()
    readonly number: number

    @IsOptional()
    @IsString()
    readonly chapterTitle?: string

    chapterType?: ChapterType
}