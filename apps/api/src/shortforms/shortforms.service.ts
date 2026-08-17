import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DomainPublicationStatus, MediaStatus } from '@stream/database';
import type { Prisma } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';

const include = {
  creator: {
    select: { id: true, handle: true, displayName: true, avatarUrl: true },
  },
  publication: { select: { likeCount: true, commentCount: true } },
  media: {
    where: { asset: { status: MediaStatus.READY } },
    orderBy: { position: 'asc' as const },
    include: { asset: true },
  },
  promotedHomeVideo: { select: { id: true, title: true } },
  promotedSeries: { select: { id: true, title: true } },
  promotedEpisode: { select: { id: true, title: true } },
} as const;

type ShortformRecord = Prisma.ShortFormGetPayload<{ include: typeof include }>;

@Injectable()
export class ShortformsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async list() {
    const records = await this.database.client.shortForm.findMany({
      where: {
        status: DomainPublicationStatus.PUBLISHED,
        publishedAt: { not: null },
      },
      include,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 24,
    });
    return { items: records.map((record) => this.map(record)) };
  }

  async findOne(id: string) {
    const record = await this.database.client.shortForm.findFirst({
      where: {
        id,
        status: DomainPublicationStatus.PUBLISHED,
        publishedAt: { not: null },
      },
      include,
    });
    if (!record) throw new NotFoundException('Shortform not found');
    return this.map(record);
  }

  private map(record: ShortformRecord) {
    if (!record.publishedAt)
      throw new Error(`Published Shortform ${record.id} has no publishedAt`);
    return {
      id: record.id,
      engagementTarget: { type: 'SHORTFORM' as const, id: record.id },
      type: record.type,
      title: record.title,
      description: record.description,
      musicKey: record.musicKey,
      publishedAt: record.publishedAt.toISOString(),
      likeCount: record.publication.likeCount,
      commentCount: record.publication.commentCount,
      creator: record.creator,
      media: record.media.map(({ asset }) => {
        if (
          !asset.publicUrl ||
          !asset.mimeType ||
          !asset.width ||
          !asset.height
        ) {
          throw new Error(
            `Ready media ${asset.id} is missing display metadata`,
          );
        }
        return {
          id: asset.id,
          url: asset.publicUrl,
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          durationMs: asset.durationMs,
        };
      }),
      promotedContent: record.promotedHomeVideo
        ? { kind: 'HOME_VIDEO' as const, ...record.promotedHomeVideo }
        : record.promotedSeries
          ? { kind: 'SERIES' as const, ...record.promotedSeries }
          : record.promotedEpisode
            ? { kind: 'SERIES_EPISODE' as const, ...record.promotedEpisode }
            : null,
    };
  }
}
