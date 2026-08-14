import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostFormat } from '@stream/database';

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
}

export class FeedItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: PostFormat, enumName: 'PostFormat' })
  format!: PostFormat;
  @ApiPropertyOptional({ type: String, nullable: true }) title!: string | null;
  @ApiProperty() caption!: string;
  @ApiProperty() publishedAt!: string;
  @ApiProperty() likeCount!: number;
  @ApiProperty() commentCount!: number;
  @ApiProperty({ type: CreatorSummaryDto }) author!: CreatorSummaryDto;
  @ApiProperty({ type: [MediaSummaryDto] }) media!: MediaSummaryDto[];
}

export class DiscoveryFeedDto {
  @ApiProperty({ type: [FeedItemDto] }) items!: FeedItemDto[];
  @ApiPropertyOptional({ type: String, nullable: true }) nextCursor!:
    | string
    | null;
}
