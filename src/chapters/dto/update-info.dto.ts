import { IsNotEmpty, IsString } from "class-validator"

export class UpdateChaptersInfoDTO {
    @IsNotEmpty()
    readonly number: number

    @IsNotEmpty()
    @IsString()
    readonly chapterTitle: string
}