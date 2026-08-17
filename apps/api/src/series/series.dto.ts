import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainPublicationStatus, SeriesWorkType } from '@stream/database';
import { EngagementTargetDto } from '../engagement/engagement.dto.js';
import { CreatorSummaryDto, MediaSummaryDto } from '../feed/feed.dto.js';
import { PlayableDto } from '../playback/playback.dto.js';

export class SeriesEpisodeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) seriesId!: string;
  @ApiProperty() episodeNumber!: number;
  @ApiPropertyOptional({ type: Number, nullable: true })
  seasonEpisodeNumber!: number | null;
  @ApiProperty() title!: string;
  @ApiProperty() synopsis!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  publishedAt!: string | null;
  @ApiPropertyOptional({ type: MediaSummaryDto, nullable: true })
  media!: MediaSummaryDto | null;
  @ApiPropertyOptional({ type: PlayableDto, nullable: true })
  playable!: PlayableDto | null;
  @ApiPropertyOptional({ type: EngagementTargetDto, nullable: true })
  engagementTarget!: EngagementTargetDto | null;
}

export class SeriesDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() synopsis!: string;
  @ApiProperty({ enum: SeriesWorkType }) workType!: SeriesWorkType;
  @ApiProperty({ enum: DomainPublicationStatus })
  publicationStatus!: DomainPublicationStatus;
  @ApiProperty({ type: [String] }) genres!: string[];
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiPropertyOptional({ type: String, nullable: true })
  ageRating!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  releaseDate!: string | null;
  @ApiProperty({ type: CreatorSummaryDto }) creator!: CreatorSummaryDto;
  @ApiPropertyOptional({ type: PlayableDto, nullable: true })
  singleWork!: PlayableDto | null;
  @ApiProperty({ type: EngagementTargetDto })
  engagementTarget!: EngagementTargetDto;
  @ApiProperty({ type: [SeriesEpisodeDto] }) episodes!: SeriesEpisodeDto[];
}

export class SeriesListDto {
  @ApiProperty({ type: [SeriesDto] }) items!: SeriesDto[];
}
