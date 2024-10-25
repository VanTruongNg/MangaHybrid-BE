import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateChapterDTO {
    @IsNotEmpty()
    readonly number: number

    @IsNotEmpty()
    @IsString()
    readonly chapterTitle: string
}