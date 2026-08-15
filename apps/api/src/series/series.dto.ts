import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainPublicationStatus, SeriesWorkType } from '@stream/database';
import { CreatorSummaryDto, FeedItemDto } from '../feed/feed.dto.js';

export class SeriesEpisodeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() episodeNumber!: number;
  @ApiPropertyOptional({ type: Number, nullable: true })
  seasonEpisodeNumber!: number | null;
  @ApiProperty() title!: string;
  @ApiProperty() synopsis!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  publishedAt!: string | null;
  @ApiProperty({ type: FeedItemDto }) publication!: FeedItemDto;
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
  @ApiProperty({ type: [SeriesEpisodeDto] }) episodes!: SeriesEpisodeDto[];
}

export class SeriesListDto {
  @ApiProperty({ type: [SeriesDto] }) items!: SeriesDto[];
}
