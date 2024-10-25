import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AwsService {
    private readonly s3Client: S3Client
    private readonly s3Bucket: string
    private readonly s3Region: string

    constructor(
        private readonly configService: ConfigService
    ){
        this.s3Region = this.configService.get("AWS_S3_REGION")

        this.s3Client = new S3Client({
            region: this.s3Region,
            credentials: {
                accessKeyId: this.configService.get('AWS_S3_ACCESS_KEY'),
                secretAccessKey: this.configService.get('AWS_S3_SECRET_ACCESS_KEY')
            },
            forcePathStyle: true
        })
        this.s3Bucket = this.configService.get<string> ("AWS_S3_PUBLIC_BUCKET")
    }

    async uploadFile (file: Express.Multer.File, fileName: string): Promise<string> {
        const uploadParams = {
            Body: file.buffer,
            Bucket: this.s3Bucket,
            Key: fileName,
            ContentType: file.mimetype,
        }
        try {
            await this.s3Client.send(new PutObjectCommand(uploadParams))
            return `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${fileName}`
        } catch (error) {
            throw new Error(`Upload file thất bại: ${error.message}`)
        }
    }

    async uploadMultiFile(files: Express.Multer.File[], baseFileName: string): Promise<string[]> {
        const uploadPromises = files.map((file, index) => {
            const fileName = `${baseFileName}-page-${index + 1}`;
            return this.uploadFile(file, fileName);
        });
    
        return await Promise.all(uploadPromises);
    }
    
}
