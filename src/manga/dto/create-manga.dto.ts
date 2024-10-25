import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Genre } from "src/genres/schemas/genre.schema";

export class CreateMangaDTO {
    @IsNotEmpty()
    readonly title: string

    readonly description: string

    @IsNotEmpty()
    @IsString()
    readonly author: string

    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    readonly genre?: Genre[]
}