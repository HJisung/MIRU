import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DomainPublicationStatus,
  MediaPurpose,
  MediaStatus,
  PostFormat,
  PostStatus,
  PostVisibility,
  ShortFormType,
} from '@stream/database';
import type { Prisma } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import type { CreateVideoShortformDto } from './shortforms.dto.js';
import { toPlayableMedia } from '../playback/playback.mapper.js';
import { MediaAttachmentService } from '../media/media-attachment.service.js';

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
    @Inject(MediaAttachmentService)
    private readonly mediaAttachments: MediaAttachmentService,
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

  async createVideo(userId: string, input: CreateVideoShortformDto) {
    if (Boolean(input.promotedKind) !== Boolean(input.promotedId))
      throw new BadRequestException(
        'promotedKind and promotedId must be provided together',
      );
    const asset = await this.mediaAttachments.readyUnlinkedOwnedVideo(
      userId,
      input.assetId,
      MediaPurpose.SHORT_VIDEO,
    );
    const promotion = await this.promotion(
      input.promotedKind,
      input.promotedId,
    );
    const created = await this.database.client.post.create({
      data: {
        authorId: userId,
        format: PostFormat.SHORT_VIDEO,
        status: PostStatus.DRAFT,
        visibility: PostVisibility.PUBLIC,
        title: input.title?.trim() || null,
        caption: input.description.trim(),
        media: { create: { assetId: asset.id, order: 0 } },
        shortForm: {
          create: {
            creatorId: userId,
            type: ShortFormType.VIDEO,
            title: input.title?.trim() || null,
            description: input.description.trim(),
            musicKey: input.musicKey?.trim() || null,
            ...promotion,
            media: { create: { assetId: asset.id, position: 0 } },
          },
        },
      },
      select: { shortForm: { select: { id: true } } },
    });
    if (!created.shortForm) throw new Error('Shortform creation failed');
    return {
      id: created.shortForm.id,
      assetId: asset.id,
      status: DomainPublicationStatus.DRAFT,
    };
  }

  async publish(userId: string, id: string) {
    const record = await this.database.client.shortForm.findFirst({
      where: {
        id,
        creatorId: userId,
        status: DomainPublicationStatus.DRAFT,
        media: {
          some: {
            asset: { kind: 'VIDEO', status: MediaStatus.READY },
          },
        },
      },
      select: { publicationId: true },
    });
    if (!record) throw new NotFoundException('Ready Shortform draft not found');
    const publishedAt = new Date();
    await this.database.client.$transaction([
      this.database.client.shortForm.update({
        where: { id },
        data: { status: DomainPublicationStatus.PUBLISHED, publishedAt },
      }),
      this.database.client.post.update({
        where: { id: record.publicationId },
        data: { status: PostStatus.PUBLISHED, publishedAt },
      }),
    ]);
    return this.findOne(id);
  }

  private async promotion(
    kind?: CreateVideoShortformDto['promotedKind'],
    id?: string,
  ) {
    if (!kind || !id) return {};
    if (kind === 'HOME_VIDEO') {
      const target = await this.database.client.homeVideo.findFirst({
        where: { id, status: DomainPublicationStatus.PUBLISHED },
      });
      if (!target)
        throw new BadRequestException('Promoted Home video is not public');
      return { promotedHomeVideoId: id };
    }
    if (kind === 'SERIES') {
      const target = await this.database.client.series.findFirst({
        where: { id, publicationStatus: DomainPublicationStatus.PUBLISHED },
      });
      if (!target)
        throw new BadRequestException('Promoted Series is not public');
      return { promotedSeriesId: id };
    }
    const target = await this.database.client.seriesEpisode.findFirst({
      where: {
        id,
        publishedAt: { not: null },
        series: { publicationStatus: DomainPublicationStatus.PUBLISHED },
      },
    });
    if (!target)
      throw new BadRequestException('Promoted Episode is not public');
    return { promotedEpisodeId: id };
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
        const media = toPlayableMedia(asset);
        if (!media) {
          throw new Error(
            `Ready media ${asset.id} is missing display metadata`,
          );
        }
        return media;
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
