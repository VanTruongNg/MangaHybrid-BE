import { IsNotEmpty, IsString } from "class-validator";

export class RefreshTokenDTO {
    @IsNotEmpty({ message: "Refresh token không được để trống" })
    @IsString()
    readonly refreshToken: string;

    @IsNotEmpty({ message: "Device ID không được để trống" })
    @IsString()
    readonly deviceId: string;
}