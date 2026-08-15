import { ApiProperty } from '@nestjs/swagger';
import { DomainPublicationStatus } from '@stream/database';
import { CreatorSummaryDto, FeedItemDto } from '../feed/feed.dto.js';

export class HomeVideoDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) publicationId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: DomainPublicationStatus })
  status!: DomainPublicationStatus;
  @ApiProperty() publishedAt!: string;
  @ApiProperty({ type: CreatorSummaryDto }) creator!: CreatorSummaryDto;
  @ApiProperty({ type: FeedItemDto }) publication!: FeedItemDto;
}

export class HomeVideoListDto {
  @ApiProperty({ type: [HomeVideoDto] }) items!: HomeVideoDto[];
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
