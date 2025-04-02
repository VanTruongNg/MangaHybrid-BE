import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AwsService } from './aws.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('AWS')
@Controller('aws')
export class AwsController {
    constructor(readonly awsService: AwsService) {}

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload file lên AWS S3' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        const fileName = file.originalname
        const fileUrl = await this.awsService.uploadFile(file, fileName)

        return fileUrl
    }
}
