import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Genre } from "src/genres/schemas/genre.schema";
import { ApiProperty } from "@nestjs/swagger";

export class CreateMangaDTO {
    @ApiProperty({
        description: 'Tên manga',
        example: 'One Piece'
    })
    @IsNotEmpty()
    readonly title: string

    @ApiProperty({
        description: 'Mô tả manga',
        example: 'Mô tả về manga'
    })
    readonly description: string

    @ApiProperty({
        description: 'Tên tác giả',
        example: 'Tác giả'
    })
    @IsNotEmpty()
    @IsString()
    readonly author: string

    @ApiProperty({
        description: 'Thể loại của manga',
        example: 'Thể loại'
    })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    readonly genre?: Genre[]
}