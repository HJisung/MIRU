import { ApiProperty } from '@nestjs/swagger';
import { DomainPublicationStatus } from '@stream/database';
import { EngagementTargetDto } from '../engagement/engagement.dto.js';
import { CreatorSummaryDto, MediaSummaryDto } from '../feed/feed.dto.js';
import { PlayableDto } from '../playback/playback.dto.js';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class HomeVideoDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: DomainPublicationStatus })
  status!: DomainPublicationStatus;
  @ApiProperty() publishedAt!: string;
  @ApiProperty({ type: CreatorSummaryDto }) creator!: CreatorSummaryDto;
  @ApiProperty({ type: MediaSummaryDto }) media!: MediaSummaryDto;
  @ApiProperty({ type: PlayableDto }) playable!: PlayableDto;
  @ApiProperty({ type: EngagementTargetDto })
  engagementTarget!: EngagementTargetDto;
  @ApiProperty() likeCount!: number;
  @ApiProperty() commentCount!: number;
}

export class HomeVideoListDto {
  @ApiProperty({ type: [HomeVideoDto] }) items!: HomeVideoDto[];
}

export class CreateHomeVideoDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() assetId!: string;
  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;
  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  description!: string;
}

export class HomeVideoDraftDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: DomainPublicationStatus })
  status!: DomainPublicationStatus;
  @ApiProperty({ format: 'uuid' }) assetId!: string;
}

export class CollectionItemDto {
  @ApiProperty() position!: number;
  @ApiProperty({ type: HomeVideoDto }) video!: HomeVideoDto;
}

export class CollectionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: CreatorSummaryDto }) owner!: CreatorSummaryDto;
  @ApiProperty() publishedAt!: string;
  @ApiProperty({ type: [CollectionItemDto] }) items!: CollectionItemDto[];
}

export class CollectionListDto {
  @ApiProperty({ type: [CollectionDto] }) items!: CollectionDto[];
}
