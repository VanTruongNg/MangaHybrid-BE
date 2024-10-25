import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class SignUpDTO {
    @IsNotEmpty({ message: "Không được để trống tên!"})
    @IsString()
    readonly name: string;
    
    @IsNotEmpty()
    @IsEmail({}, {message: "Nhập email chính xác!"})
    readonly email: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6, {message: "Mật khẩu phải có ít nhất 6 ký tự"})
    readonly password: string;

    @IsNotEmpty()
    @IsString()
    readonly confirmPassword: string;
}