import { IsNotEmpty, IsString } from "class-validator";

export class UpdateCommentDTO {
    @IsNotEmpty({ message: 'Nội dung comment không được để trống' })
    @IsString()
    content: string;
}