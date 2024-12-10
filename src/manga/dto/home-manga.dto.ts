import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum HomeSection {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    LATEST = 'latest',
    TOP = 'top',
    RANDOM = 'random'
}

export class HomeMangaDto {
    @ApiProperty({ required: false, enum: HomeSection, isArray: true })
    @IsOptional()
    @IsEnum(HomeSection, { each: true })
    sections?: HomeSection[] = [
        HomeSection.DAILY,
        HomeSection.WEEKLY,
        HomeSection.LATEST,
        HomeSection.TOP,
        HomeSection.RANDOM
    ];

    @ApiProperty({ required: false, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 24;
} 