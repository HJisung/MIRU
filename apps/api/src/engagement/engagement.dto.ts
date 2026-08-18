import { ApiProperty } from '@nestjs/swagger';

export enum EngagementTargetType {
  HOME_VIDEO = 'HOME_VIDEO',
  SERIES = 'SERIES',
  SERIES_EPISODE = 'SERIES_EPISODE',
  SHORTFORM = 'SHORTFORM',
  COMMUNITY_POST = 'COMMUNITY_POST',
}

export class EngagementTargetDto {
  @ApiProperty({ enum: EngagementTargetType })
  type!:
    | 'HOME_VIDEO'
    | 'SERIES'
    | 'SERIES_EPISODE'
    | 'SHORTFORM'
    | 'COMMUNITY_POST';

  @ApiProperty({ format: 'uuid', description: 'Product-domain entity ID' })
  id!: string;
}

export class EngagementLikeStateDto {
  @ApiProperty() liked!: boolean;
  @ApiProperty() likeCount!: number;
}

export class EngagementSaveStateDto {
  @ApiProperty() saved!: boolean;
}

export class EngagementAuthorDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() handle!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
}

export class EngagementCommentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() body!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ type: EngagementAuthorDto }) author!: EngagementAuthorDto;
}

export class EngagementCommentListDto {
  @ApiProperty({ type: [EngagementCommentDto] }) items!: EngagementCommentDto[];
}
