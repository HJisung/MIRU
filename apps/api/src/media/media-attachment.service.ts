import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaStatus, type Prisma } from '@stream/database';

@Injectable()
export class MediaAttachmentService {
  async claimOwnedVideo(
    transaction: Prisma.TransactionClient,
    userId: string,
    assetId: string,
    purpose: 'LONG_VIDEO' | 'SHORT_VIDEO' | 'POST_VIDEO',
    statuses: MediaStatus[],
    kind:
      | 'HOME_VIDEO'
      | 'SERIES_SINGLE'
      | 'SERIES_EPISODE'
      | 'SHORTFORM'
      | 'COMMUNITY_POST_VIDEO',
  ) {
    const asset = await transaction.mediaAsset.findFirst({
      where: {
        id: assetId,
        ownerId: userId,
        kind: 'VIDEO',
        purpose,
        status: { in: statuses },
        homeVideos: { none: {} },
        seriesSingleWork: { none: {} },
        seriesEpisodes: { none: {} },
        shortFormLinks: { none: {} },
        communityLinks: { none: {} },
      },
    });
    if (!asset)
      throw new NotFoundException('Ready unlinked owned video asset not found');
    try {
      await transaction.mediaPlaybackClaim.create({ data: { assetId, kind } });
    } catch (error) {
      const code =
        typeof error === 'object' && error
          ? (error as { code?: unknown }).code
          : undefined;
      if (code === 'P2002')
        throw new ConflictException('Video asset is already attached');
      throw error;
    }
    return asset;
  }
}
