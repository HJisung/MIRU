import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AdminSeriesSubmissionDto,
  AdminSeriesSubmissionListDto,
  AttachSingleWorkVideoDto,
  CreateSeriesDto,
  CreateSeriesEpisodeDto,
  CreateSeriesSeasonDto,
  ManagedSeriesEpisodeDto,
  ManagedSeriesDto,
  ManagedSeriesListDto,
  ReorderSeriesEpisodesDto,
  ReviewSeriesSubmissionDto,
  SeriesDto,
  SeriesEpisodeDto,
  SeriesListDto,
  SeriesMediaDraftDto,
  SeriesSubmissionDto,
  UpdateSeriesDto,
  UpdateSeriesEpisodeDto,
  UpdateSeriesSeasonDto,
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

  @Post()
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: ManagedSeriesDto })
  create(@CurrentUser() user: AuthUser, @Body() input: CreateSeriesDto) {
    return this.series.create(user, input);
  }

  @Get('mine')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ManagedSeriesListDto })
  mine(@CurrentUser() user: AuthUser) {
    return this.series.mine(user);
  }

  @Get(':seriesId/manage')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ManagedSeriesDto })
  manage(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
  ) {
    return this.series.manage(user, seriesId);
  }

  @Patch(':seriesId')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ManagedSeriesDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
    @Body() input: UpdateSeriesDto,
  ) {
    return this.series.update(user, seriesId, input);
  }

  @Post(':seriesId/submissions')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: SeriesSubmissionDto })
  submit(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
  ) {
    return this.series.submit(user, seriesId);
  }

  @Post(':seriesId/submissions/:submissionId/withdraw')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: SeriesSubmissionDto })
  withdraw(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
  ) {
    return this.series.withdraw(user, seriesId, submissionId);
  }

  @Post(':seriesId/publish')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: SeriesDto })
  publish(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
  ) {
    return this.series.publish(user, seriesId);
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

  @Post(':seriesId/seasons')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: ManagedSeriesDto })
  createSeason(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
    @Body() input: CreateSeriesSeasonDto,
  ) {
    return this.series.createSeason(user, seriesId, input);
  }

  @Patch(':seriesId/seasons/:seasonId')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ManagedSeriesDto })
  updateSeason(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
    @Param('seasonId', new ParseUUIDPipe()) seasonId: string,
    @Body() input: UpdateSeriesSeasonDto,
  ) {
    return this.series.updateSeason(user, seriesId, seasonId, input);
  }

  @Delete(':seriesId/seasons/:seasonId')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ManagedSeriesDto })
  deleteSeason(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
    @Param('seasonId', new ParseUUIDPipe()) seasonId: string,
  ) {
    return this.series.deleteSeason(user, seriesId, seasonId);
  }

  @Patch(':seriesId/episodes/:episodeId')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ManagedSeriesDto })
  updateEpisode(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
    @Param('episodeId', new ParseUUIDPipe()) episodeId: string,
    @Body() input: UpdateSeriesEpisodeDto,
  ) {
    return this.series.updateEpisode(user, seriesId, episodeId, input);
  }

  @Put(':seriesId/episodes/order')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ManagedSeriesDto })
  reorderEpisodes(
    @CurrentUser() user: AuthUser,
    @Param('seriesId', new ParseUUIDPipe()) seriesId: string,
    @Body() input: ReorderSeriesEpisodesDto,
  ) {
    return this.series.reorderEpisodes(user, seriesId, input.episodeIds);
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

  @Post('episodes/:episodeId/unpublish')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: ManagedSeriesEpisodeDto })
  unpublishEpisode(
    @CurrentUser() user: AuthUser,
    @Param('episodeId', new ParseUUIDPipe()) episodeId: string,
  ) {
    return this.series.unpublishEpisode(user, episodeId);
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

@ApiTags('admin-series-reviews')
@Controller('admin/series-submissions')
@UseGuards(SessionGuard)
export class SeriesAdminController {
  constructor(@Inject(SeriesService) private readonly series: SeriesService) {}

  @Get()
  @ApiOkResponse({ type: AdminSeriesSubmissionListDto })
  list(@CurrentUser() user: AuthUser) {
    return this.series.reviewQueue(user);
  }

  @Get(':submissionId')
  @ApiOkResponse({ type: AdminSeriesSubmissionDto })
  find(
    @CurrentUser() user: AuthUser,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
  ) {
    return this.series.reviewDetail(user, submissionId);
  }

  @Post(':submissionId/approve')
  @HttpCode(200)
  @ApiOkResponse({ type: AdminSeriesSubmissionDto })
  approve(
    @CurrentUser() user: AuthUser,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Body() input: ReviewSeriesSubmissionDto,
  ) {
    return this.series.review(user, submissionId, 'APPROVED', input.reason);
  }

  @Post(':submissionId/reject')
  @HttpCode(200)
  @ApiOkResponse({ type: AdminSeriesSubmissionDto })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Body() input: ReviewSeriesSubmissionDto,
  ) {
    return this.series.review(user, submissionId, 'REJECTED', input.reason);
  }
}
