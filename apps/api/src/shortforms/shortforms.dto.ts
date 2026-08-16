import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShortFormType } from '@stream/database';
import { CreatorSummaryDto, MediaSummaryDto } from '../feed/feed.dto.js';

export class ShortformPromotionDto {
  @ApiProperty({ enum: ['HOME_VIDEO', 'SERIES', 'SERIES_EPISODE'] })
  kind!: 'HOME_VIDEO' | 'SERIES' | 'SERIES_EPISODE';
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  publicationId!: string | null;
}

export class ShortformDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({
    format: 'uuid',
    description: 'Compatibility engagement target',
  })
  engagementTargetId!: string;
  @ApiProperty({ enum: ShortFormType }) type!: ShortFormType;
  @ApiPropertyOptional({ type: String, nullable: true }) title!: string | null;
  @ApiProperty() description!: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'External music catalog reference',
  })
  musicKey!: string | null;
  @ApiProperty() publishedAt!: string;
  @ApiProperty() likeCount!: number;
  @ApiProperty() commentCount!: number;
  @ApiProperty({ type: CreatorSummaryDto }) creator!: CreatorSummaryDto;
  @ApiProperty({ type: [MediaSummaryDto] }) media!: MediaSummaryDto[];
  @ApiPropertyOptional({ type: ShortformPromotionDto, nullable: true })
  promotedContent!: ShortformPromotionDto | null;
}

export class ShortformListDto {
  @ApiProperty({ type: [ShortformDto] }) items!: ShortformDto[];
}
