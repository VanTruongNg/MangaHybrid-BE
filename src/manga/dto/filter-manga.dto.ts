import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsArray, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum MangaStatus {
    ONGOING = 'ongoing',
    COMPLETED = 'completed',
    DROPPED = 'dropped',
    HIATUS = 'hiatus'
}

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc'
}

export enum SortBy {
    TITLE = 'title',
    VIEWS = 'view',
    RATING = 'rating',
    UPDATED = 'updatedAt',
    CREATED = 'createdAt'
}

export class FilterMangaDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ required: false, enum: MangaStatus })
    @IsOptional()
    @IsEnum(MangaStatus)
    status?: MangaStatus;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    genres?: string[];

    @ApiProperty({ required: false, enum: SortBy })
    @IsOptional()
    @IsEnum(SortBy)
    sortBy?: SortBy = SortBy.UPDATED;

    @ApiProperty({ required: false, enum: SortOrder })
    @IsOptional()
    @IsEnum(SortOrder)
    order?: SortOrder = SortOrder.DESC;

    @ApiProperty({ required: false, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ required: false, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 24;
} 