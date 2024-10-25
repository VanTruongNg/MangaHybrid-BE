import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDTO {   
    @IsNotEmpty()
    @IsEmail({}, {message: "Nhập email chính xác!"})
    readonly email: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    readonly password: string;
}