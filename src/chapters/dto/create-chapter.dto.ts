import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateChapterDTO {
    @IsNotEmpty()
    readonly number: number

    @IsOptional()
    @IsString()
    readonly chapterTitle?: string
}