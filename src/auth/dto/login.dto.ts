import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDTO {   
    @ApiProperty({
        description: 'Email đăng nhập của người dùng',
        example: 'user@example.com'
    })
    @IsEmail({}, {message: "Nhập email chính xác!"})
    readonly email: string;

    @ApiProperty({
        description: 'Mật khẩu đăng nhập',
        example: '123456',
        minLength: 6
    })
    @IsString()
    @MinLength(6)
    readonly password: string;
}