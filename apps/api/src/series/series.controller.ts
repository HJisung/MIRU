import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AttachSingleWorkVideoDto,
  CreateSeriesEpisodeDto,
  SeriesDto,
  SeriesEpisodeDto,
  SeriesListDto,
  SeriesMediaDraftDto,
} from './series.dto.js';
import { SeriesService } from './series.service.js';
import type { AuthUser } from '../auth/auth.service.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';

@ApiTags('series')
@Controller('series')
export class SeriesController {
  constructor(@Inject(SeriesService) private readonly series: SeriesService) {}

  @Get()
  @ApiOkResponse({ type: SeriesListDto })
  list() {
    return this.series.list();
  }

  @Post(':seriesId/single-work/video')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: SeriesMediaDraftDto })
  attachSingleWork(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
    @Body() input: AttachSingleWorkVideoDto,
  ) {
    return this.series.attachSingleWork(user, seriesId, input.assetId);
  }

  @Post(':seriesId/episodes')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: SeriesMediaDraftDto })
  createEpisode(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
    @Body() input: CreateSeriesEpisodeDto,
  ) {
    return this.series.createEpisode(user, seriesId, input);
  }

  @Post('episodes/:episodeId/publish')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: SeriesEpisodeDto })
  publishEpisode(
    @CurrentUser() user: AuthUser,
    @Param('episodeId', new ParseUUIDPipe()) episodeId: string,
  ) {
    return this.series.publishEpisode(user, episodeId);
  }

  @Get('episodes/:episodeId')
  @ApiOkResponse({ type: SeriesEpisodeDto })
  @ApiNotFoundResponse({ description: 'Episode is not published' })
  findEpisode(@Param('episodeId', new ParseUUIDPipe()) episodeId: string) {
    return this.series.findEpisode(episodeId);
  }

  @Get(':seriesId')
  @ApiOkResponse({ type: SeriesDto })
  @ApiNotFoundResponse({ description: 'Series is not published' })
  findOne(@Param('seriesId', new ParseUUIDPipe()) seriesId: string) {
    return this.series.findOne(seriesId);
  }
}
