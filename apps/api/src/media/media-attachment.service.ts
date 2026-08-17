import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MediaStatus } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class MediaAttachmentService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async readyUnlinkedOwnedVideo(
    userId: string,
    assetId: string,
    purpose: 'LONG_VIDEO' | 'SHORT_VIDEO',
  ) {
    const asset = await this.database.client.mediaAsset.findFirst({
      where: {
        id: assetId,
        ownerId: userId,
        kind: 'VIDEO',
        purpose,
        status: MediaStatus.READY,
        homeVideos: { none: {} },
        seriesSingleWork: { none: {} },
        seriesEpisodes: { none: {} },
        shortFormLinks: { none: {} },
      },
    });
    if (!asset)
      throw new NotFoundException('Ready unlinked owned video asset not found');
    return asset;
  }
}
