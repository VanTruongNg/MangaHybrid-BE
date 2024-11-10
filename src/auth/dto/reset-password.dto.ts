import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDTO {
    @IsNotEmpty()
    @IsString()
    readonly resetToken: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
    readonly password: string;

    @IsNotEmpty()
    @IsString()
    readonly confirmPassword: string;
}

export class VerifyOtpDTO {
    @IsNotEmpty({ message: "Mã OTP không được để trống" })
    @IsString()
    readonly resetToken: string;
}