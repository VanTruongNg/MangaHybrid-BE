import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AwsService } from './aws.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('aws')
export class AwsController {
    constructor(readonly awsService: AwsService) {}

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        const fileName = file.originalname
        const fileUrl = await this.awsService.uploadFile(file, fileName)

        return fileUrl
    }
}
