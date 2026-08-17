import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DomainPublicationStatus, SeriesWorkType } from '@stream/database';
import { EngagementTargetDto } from '../engagement/engagement.dto.js';
import { CreatorSummaryDto, MediaSummaryDto } from '../feed/feed.dto.js';
import { PlayableDto } from '../playback/playback.dto.js';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSeriesDto {
  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  synopsis!: string;

  @ApiProperty({ enum: SeriesWorkType })
  @IsEnum(SeriesWorkType)
  workType!: SeriesWorkType;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ nullable: true, maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  ageRating?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  productionInfo?: Record<string, string>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  releaseDate?: string | null;
}

export class UpdateSeriesDto extends PartialType(CreateSeriesDto) {}

export class ReviewSeriesSubmissionDto {
  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class SeriesSubmissionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
  })
  status!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) submittedAt!:
    | string
    | null;
  @ApiPropertyOptional({ type: String, nullable: true }) reviewedAt!:
    | string
    | null;
  @ApiPropertyOptional({ type: String, nullable: true }) decisionReason!:
    | string
    | null;
  @ApiPropertyOptional({ type: CreatorSummaryDto, nullable: true })
  reviewer!: CreatorSummaryDto | null;
}

export class ManagedSeriesDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() synopsis!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: SeriesWorkType }) workType!: SeriesWorkType;
  @ApiProperty({ enum: DomainPublicationStatus })
  publicationStatus!: DomainPublicationStatus;
  @ApiProperty({ type: [String] }) genres!: string[];
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiPropertyOptional({ type: String, nullable: true }) ageRating!:
    | string
    | null;
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  productionInfo!: Record<string, unknown> | null;
  @ApiPropertyOptional({ type: String, nullable: true }) releaseDate!:
    | string
    | null;
  @ApiProperty() hasPlayableContent!: boolean;
  @ApiProperty() canManageContent!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ type: [SeriesSubmissionDto] })
  submissions!: SeriesSubmissionDto[];
  @ApiPropertyOptional({ type: SeriesSubmissionDto, nullable: true })
  latestSubmission!: SeriesSubmissionDto | null;
}

export class ManagedSeriesListDto {
  @ApiProperty({ type: [ManagedSeriesDto] }) items!: ManagedSeriesDto[];
}

export class AdminSeriesSubmissionDto extends SeriesSubmissionDto {
  @ApiProperty({ type: ManagedSeriesDto }) series!: ManagedSeriesDto;
  @ApiProperty({ type: CreatorSummaryDto }) applicant!: CreatorSummaryDto;
}

export class AdminSeriesSubmissionListDto {
  @ApiProperty({ type: [AdminSeriesSubmissionDto] })
  items!: AdminSeriesSubmissionDto[];
}

export class AttachSingleWorkVideoDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() assetId!: string;
}

export class CreateSeriesEpisodeDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() assetId!: string;
  @ApiProperty() @IsInt() @Min(1) episodeNumber!: number;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  seasonId?: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  seasonEpisodeNumber?: number;
  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;
  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  synopsis!: string;
}

export class SeriesMediaDraftDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) assetId!: string;
  @ApiProperty({ enum: DomainPublicationStatus })
  status!: DomainPublicationStatus;
}

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
