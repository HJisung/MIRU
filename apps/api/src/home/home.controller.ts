import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CollectionListDto,
  HomeVideoDto,
  HomeVideoListDto,
  CreateHomeVideoDto,
  HomeVideoDraftDto,
} from './home.dto.js';
import { HomeService } from './home.service.js';
import type { AuthUser } from '../auth/auth.service.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';

@ApiTags('home')
@Controller('home')
export class HomeController {
  constructor(@Inject(HomeService) private readonly home: HomeService) {}

  @Get('videos')
  @ApiOkResponse({ type: HomeVideoListDto })
  list() {
    return this.home.list();
  }

  @Post('videos')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: HomeVideoDraftDto })
  create(@CurrentUser() user: AuthUser, @Body() input: CreateHomeVideoDto) {
    return this.home.create(user.id, input);
  }

  @Post('videos/:videoId/publish')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: HomeVideoDto })
  publish(
    @CurrentUser() user: AuthUser,
    @Param('videoId', new ParseUUIDPipe()) videoId: string,
  ) {
    return this.home.publish(user.id, videoId);
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
