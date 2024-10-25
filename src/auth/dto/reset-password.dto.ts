import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPassworDTO {
    @IsNotEmpty()
    @IsEmail({}, {message: "Nhập email chính xác!"})
    readonly email: string;

    @IsNotEmpty()
    readonly resetToken: string

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    readonly password: string;
}