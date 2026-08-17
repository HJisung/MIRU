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
