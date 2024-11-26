import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDTO {
    @ApiProperty({
        description: 'Google ID Token'
    })
    @IsNotEmpty({ message: 'ID Token không được để trống' })
    @IsString()
    readonly accessToken: string;
}