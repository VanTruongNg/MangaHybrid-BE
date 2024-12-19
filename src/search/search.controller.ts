import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('manga')
  @ApiOperation({ summary: 'Tìm kiếm truyện' })
  @ApiQuery({ name: 'query', required: true, description: 'Từ khóa tìm kiếm' })
  async searchManga(@Query('query') query: string) {
    return this.searchService.searchManga(query);
  }

  @Get('uploader')
  @ApiOperation({ summary: 'Tìm kiếm người tải lên' })
  @ApiQuery({ name: 'query', required: true, description: 'Từ khóa tìm kiếm' })
  async searchUploader(@Query('query') query: string) {
    return this.searchService.searchUploader(query);
  }
} 