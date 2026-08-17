import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainPublicationStatus, ShortFormType } from '@stream/database';
import { CreatorSummaryDto, MediaSummaryDto } from '../feed/feed.dto.js';
import { EngagementTargetDto } from '../engagement/engagement.dto.js';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateVideoShortformDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() assetId!: string;
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;
  @ApiProperty({ maxLength: 2200 })
  @IsString()
  @MaxLength(2200)
  description!: string;
  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  musicKey?: string;
  @ApiPropertyOptional({ enum: ['HOME_VIDEO', 'SERIES', 'SERIES_EPISODE'] })
  @IsOptional()
  @IsIn(['HOME_VIDEO', 'SERIES', 'SERIES_EPISODE'])
  promotedKind?: 'HOME_VIDEO' | 'SERIES' | 'SERIES_EPISODE';
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  promotedId?: string;
}

export class ShortformDraftDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) assetId!: string;
  @ApiProperty({ enum: DomainPublicationStatus })
  status!: DomainPublicationStatus;
}

export class ShortformPromotionDto {
  @ApiProperty({ enum: ['HOME_VIDEO', 'SERIES', 'SERIES_EPISODE'] })
  kind!: 'HOME_VIDEO' | 'SERIES' | 'SERIES_EPISODE';
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
}

export class ShortformDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: EngagementTargetDto })
  engagementTarget!: EngagementTargetDto;
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
