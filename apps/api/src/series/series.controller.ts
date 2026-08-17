import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SeriesDto, SeriesEpisodeDto, SeriesListDto } from './series.dto.js';
import { SeriesService } from './series.service.js';

@ApiTags('series')
@Controller('series')
export class SeriesController {
  constructor(@Inject(SeriesService) private readonly series: SeriesService) {}

  @Get()
  @ApiOkResponse({ type: SeriesListDto })
  list() {
    return this.series.list();
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
