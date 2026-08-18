import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostFormat } from '@stream/database';
import { CreatorSummaryDto, MediaSummaryDto } from '../feed/feed.dto.js';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateImagePostDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assetId!: string;

  @ApiProperty({ maxLength: 2200 })
  @IsString()
  @MaxLength(2200)
  caption!: string;
}

export class LegacyPostDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: PostFormat }) format!: PostFormat;
  @ApiPropertyOptional({ type: String, nullable: true }) title!: string | null;
  @ApiProperty() caption!: string;
  @ApiProperty() publishedAt!: string;
  @ApiProperty() likeCount!: number;
  @ApiProperty() commentCount!: number;
  @ApiProperty({ type: CreatorSummaryDto }) author!: CreatorSummaryDto;
  @ApiProperty({ type: [MediaSummaryDto] }) media!: MediaSummaryDto[];
}
