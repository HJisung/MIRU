import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  ManagedSeriesDto,
  ManagedSeriesListDto,
  ReviewSeriesSubmissionDto,
  SeriesDto,
  SeriesEpisodeDto,
  SeriesListDto,
  SeriesMediaDraftDto,
  SeriesSubmissionDto,
  UpdateSeriesDto,
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
