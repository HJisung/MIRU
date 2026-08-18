import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EngagementTargetDto } from '../engagement/engagement.dto.js';

export enum FeedItemType {
  HOME_VIDEO = 'HOME_VIDEO',
  SERIES = 'SERIES',
  SERIES_EPISODE = 'SERIES_EPISODE',
  SHORTFORM = 'SHORTFORM',
}
export class CreatorSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() handle!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl!:
    | string
    | null;
}
export class MediaSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
  @ApiPropertyOptional({ type: Number, nullable: true }) durationMs!:
    | number
    | null;
  @ApiPropertyOptional({ type: String, nullable: true }) posterUrl!:
    | string
    | null;
}
export class SeriesSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() episodeNumber!: number;
  @ApiProperty() episodeCount!: number;
}
export class FeedItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: FeedItemType }) type!: FeedItemType;
  @ApiPropertyOptional({ type: String, nullable: true }) title!: string | null;
  @ApiProperty() caption!: string;
  @ApiProperty() publishedAt!: string;
  @ApiProperty() likeCount!: number;
  @ApiProperty() commentCount!: number;
  @ApiProperty({ type: EngagementTargetDto })
  engagementTarget!: EngagementTargetDto;
  @ApiProperty({ type: CreatorSummaryDto }) author!: CreatorSummaryDto;
  @ApiProperty({ type: [MediaSummaryDto] }) media!: MediaSummaryDto[];
  @ApiPropertyOptional({ type: SeriesSummaryDto, nullable: true })
  series!: SeriesSummaryDto | null;
}
export class DiscoveryFeedDto {
  @ApiProperty({ type: [FeedItemDto] }) items!: FeedItemDto[];
  @ApiPropertyOptional({ type: String, nullable: true }) nextCursor!:
    | string
    | null;
}
