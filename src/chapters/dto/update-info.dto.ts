import { IsNotEmpty, IsString } from "class-validator"
import { ChapterType } from "../schemas/chapter.shema"

export class UpdateChaptersInfoDTO {
    @IsNotEmpty()
    readonly number: number

    @IsNotEmpty()
    @IsString()
    readonly chapterTitle: string

    chapterType?: ChapterType
}