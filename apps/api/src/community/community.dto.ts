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
import { EngagementTargetDto } from '../engagement/engagement.dto.js';

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

export class LegacyCreateCommunityImagePostDto {
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

export class CreateCommunityImagePostDto extends LegacyCreateCommunityImagePostDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  creationId!: string;
}

export class LegacyCreateCommunityImagePostResponseDto {
  @ApiProperty({ format: 'uuid', description: 'Community Post product ID' })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Temporary compatibility engagement target ID',
  })
  engagementTargetId!: string;

  @ApiProperty() publishedAt!: string;
}

export class CreateCommunityTextPostDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  creationId!: string;

  @ApiProperty({ maxLength: 2200 })
  @IsString()
  @MaxLength(2200)
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  categorySlug?: string;
}

export class CreateCommunityVideoPostDto extends CreateCommunityTextPostDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assetId!: string;
}

export class CreateCommunityLinkPostDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  creationId!: string;

  @ApiProperty({ maxLength: 2200 })
  @IsString()
  @MaxLength(2200)
  body!: string;

  @ApiProperty({ maxLength: 2048 })
  @IsString()
  @MaxLength(2048)
  linkUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  categorySlug?: string;
}

export class UpdateCommunityPostDto {
  @ApiPropertyOptional({ maxLength: 2200 })
  @IsOptional()
  @IsString()
  @MaxLength(2200)
  body?: string;

  @ApiPropertyOptional({ type: String, maxLength: 2048, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  linkUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  categorySlug?: string | null;
}

export class CommunityPostDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: EngagementTargetDto })
  engagementTarget!: EngagementTargetDto;
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

export class ManagedCommunityPostDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: EngagementTargetDto })
  engagementTarget!: EngagementTargetDto;
  @ApiProperty({ enum: CommunityPostType }) type!: CommunityPostType;
  @ApiProperty() body!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) linkUrl!:
    | string
    | null;
  @ApiPropertyOptional({ type: String, nullable: true }) publishedAt!:
    | string
    | null;
  @ApiProperty() likeCount!: number;
  @ApiProperty() commentCount!: number;
  @ApiProperty({ type: CreatorSummaryDto }) author!: CreatorSummaryDto;
  @ApiPropertyOptional({ type: CommunityCategoryDto, nullable: true })
  category!: CommunityCategoryDto | null;
  @ApiProperty({ type: [MediaSummaryDto] }) media!: MediaSummaryDto[];
  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'REMOVED'] })
  status!: string;
}

export class ManagedCommunityPostListDto {
  @ApiProperty({ type: [ManagedCommunityPostDto] })
  items!: ManagedCommunityPostDto[];
}

export class CommunityPostListDto {
  @ApiProperty({ type: [CommunityPostDto] }) items!: CommunityPostDto[];
}

export class CommunityCategoryListDto {
  @ApiProperty({ type: [CommunityCategoryDto] }) items!: CommunityCategoryDto[];
}
