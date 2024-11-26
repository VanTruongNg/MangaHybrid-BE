import { forwardRef, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from 'src/auth/auth.module';
import { AwsModule } from 'src/aws/aws.module';
import { MangaModule } from './../manga/manga.module';
import { ChaptersModule } from 'src/chapters/chapters.module';

@Module({
    imports: [
        AuthModule,
        AwsModule,
        forwardRef(() => MangaModule),
        forwardRef(() => ChaptersModule)
    ],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService]
})
export class UserModule {}
