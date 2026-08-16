import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityPostType } from '@stream/database';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { CreatorSummaryDto, MediaSummaryDto } from '../feed/feed.dto.js';

export class CommunityCategoryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
}

export class CommunityPostQueryDto {
  @ApiPropertyOptional({ description: 'Category slug. Omit for Post Home.' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  category?: string;
}

export class CreateCommunityImagePostDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assetId!: string;

  @ApiProperty({ maxLength: 2200 })
  @IsString()
  @MaxLength(2200)
  caption!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  categorySlug?: string;
}

export class CommunityPostDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({
    format: 'uuid',
    description: 'Compatibility engagement target',
  })
  engagementTargetId!: string;
  @ApiProperty({ enum: CommunityPostType }) type!: CommunityPostType;
  @ApiProperty() body!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) linkUrl!:
    | string
    | null;
  @ApiProperty() publishedAt!: string;
  @ApiProperty() likeCount!: number;
  @ApiProperty() commentCount!: number;
  @ApiProperty({ type: CreatorSummaryDto }) author!: CreatorSummaryDto;
  @ApiPropertyOptional({ type: CommunityCategoryDto, nullable: true })
  category!: CommunityCategoryDto | null;
  @ApiProperty({ type: [MediaSummaryDto] }) media!: MediaSummaryDto[];
}

export class CommunityPostListDto {
  @ApiProperty({ type: [CommunityPostDto] }) items!: CommunityPostDto[];
}

export class CommunityCategoryListDto {
  @ApiProperty({ type: [CommunityCategoryDto] }) items!: CommunityCategoryDto[];
}
