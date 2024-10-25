import { IsNotEmpty, MinLength } from "class-validator";

export class ResetPassworDTO {

    @IsNotEmpty()
    readonly oldPassword: string

    @IsNotEmpty()
    @MinLength(6, { message: "Mật khẩu phải có ít nhất 6 ký tự"})
    readonly newPassword: string

    @IsNotEmpty()
    readonly confirmPassword: string
}