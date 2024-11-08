import { IsOptional, IsString } from "class-validator";
import { IsNotEmpty } from "class-validator";

export class CreateCommentDto {
    @IsNotEmpty({ message: 'Nội dung comment không được để trống' })
    @IsString() 
    content: string;

    @IsOptional()
    @IsString()
    mangaId?: string;

    @IsOptional()
    @IsString()
    chapterId?: string;

    @IsOptional()
    @IsString()
    parentCommentId?: string;

    @IsOptional()
    @IsString()
    replyToUserId?: string;
}