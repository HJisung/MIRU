import { ApiProperty } from '@nestjs/swagger';
import { MediaSummaryDto } from '../feed/feed.dto.js';

export class PlayableDto {
  @ApiProperty({ enum: ['HOME_VIDEO', 'SERIES', 'SERIES_EPISODE'] })
  kind!: 'HOME_VIDEO' | 'SERIES' | 'SERIES_EPISODE';

  @ApiProperty({ format: 'uuid', description: 'Product-domain playable ID' })
  id!: string;

  @ApiProperty({ type: MediaSummaryDto })
  media!: MediaSummaryDto;
}
