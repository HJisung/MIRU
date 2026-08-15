import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CollectionListDto,
  HomeVideoDto,
  HomeVideoListDto,
} from './home.dto.js';
import { HomeService } from './home.service.js';

@ApiTags('home')
@Controller('home')
export class HomeController {
  constructor(@Inject(HomeService) private readonly home: HomeService) {}

  @Get('videos')
  @ApiOkResponse({ type: HomeVideoListDto })
  list() {
    return this.home.list();
  }

  @Get('videos/:videoId')
  @ApiOkResponse({ type: HomeVideoDto })
  @ApiNotFoundResponse({ description: 'Home video is not published' })
  findOne(@Param('videoId', new ParseUUIDPipe()) videoId: string) {
    return this.home.findOne(videoId);
  }

  @Get('collections')
  @ApiOkResponse({ type: CollectionListDto })
  collections() {
    return this.home.listCollections();
  }
}
