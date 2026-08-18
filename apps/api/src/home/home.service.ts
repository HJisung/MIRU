import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DomainPublicationStatus,
  EngagementTargetType,
  MediaPurpose,
  MediaStatus,
} from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { MediaAttachmentService } from '../media/media-attachment.service.js';
import { EngagementTargetService } from '../engagement/engagement-target.service.js';
import { EngagementTargetType as ApiEngagementTargetType } from '../engagement/engagement.dto.js';
import { toPlayableMedia } from '../playback/playback.mapper.js';
import type { HomeVideoDto } from './home.dto.js';
import type { CreateHomeVideoDto } from './home.dto.js';

const homeInclude = {
  creator: {
    select: {
      id: true,
      handle: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  videoAsset: true,
  engagementTarget: { select: { likeCount: true, commentCount: true } },
} as const;

@Injectable()
export class HomeService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(MediaAttachmentService)
    private readonly mediaAttachments: MediaAttachmentService,
    @Inject(EngagementTargetService)
    private readonly targets: EngagementTargetService,
  ) {}

  async list(): Promise<{ items: HomeVideoDto[] }> {
    const videos = await this.database.client.homeVideo.findMany({
      where: {
        status: DomainPublicationStatus.PUBLISHED,
        publishedAt: { not: null },
      },
      include: homeInclude,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 24,
    });
    return { items: videos.map((video) => this.map(video)) };
  }

  async create(userId: string, input: CreateHomeVideoDto) {
    const existing = await this.database.client.homeVideo.findFirst({
      where: { creatorId: userId, videoAssetId: input.assetId },
      select: { id: true, status: true, videoAssetId: true },
    });
    if (existing) {
      return {
        id: existing.id,
        status: existing.status,
        assetId: existing.videoAssetId!,
      };
    }
    const created = await this.database.client.$transaction(async (tx) => {
      const asset = await this.mediaAttachments.claimOwnedVideo(
        tx,
        userId,
        input.assetId,
        MediaPurpose.LONG_VIDEO,
        [MediaStatus.UPLOADED, MediaStatus.PROCESSING, MediaStatus.READY],
        'HOME_VIDEO',
      );
      return tx.homeVideo.create({
        data: {
          creatorId: userId,
          videoAssetId: asset.id,
          title: input.title.trim(),
          description: input.description.trim(),
          engagementTarget: {
            create: { type: EngagementTargetType.HOME_VIDEO },
          },
        },
        select: { id: true, status: true, videoAssetId: true },
      });
    });
    return {
      id: created.id,
      status: created.status,
      assetId: created.videoAssetId,
    };
  }

  async publish(userId: string, id: string) {
    const record = await this.database.client.homeVideo.findFirst({
      where: {
        id,
        creatorId: userId,
      },
      select: {
        status: true,
        videoAsset: { select: { status: true } },
      },
    });
    if (!record) throw new NotFoundException('Home video draft not found');
    if (record.status === DomainPublicationStatus.PUBLISHED)
      return this.findOne(id);
    if (record.videoAsset?.status !== MediaStatus.READY)
      throw new NotFoundException('Ready Home video draft not found');
    const publishedAt = new Date();
    await this.database.client.$transaction(async (tx) => {
      await this.targets.lockActive(tx, ApiEngagementTargetType.HOME_VIDEO, id);
      await tx.homeVideo.update({
        where: { id },
        data: { status: DomainPublicationStatus.PUBLISHED, publishedAt },
      });
    });
    return this.findOne(id);
  }

  async findOne(id: string): Promise<HomeVideoDto> {
    const video = await this.database.client.homeVideo.findFirst({
      where: { id, status: DomainPublicationStatus.PUBLISHED },
      include: homeInclude,
    });
    if (!video) throw new NotFoundException('Home video not found');
    return this.map(video);
  }

  async listCollections() {
    const collections = await this.database.client.collection.findMany({
      where: {
        status: DomainPublicationStatus.PUBLISHED,
        publishedAt: { not: null },
      },
      include: {
        owner: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        items: {
          include: {
            homeVideo: {
              include: homeInclude,
            },
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    });
    return {
      items: collections.map((collection) => {
        if (!collection.publishedAt) {
          throw new Error(
            `Published Collection ${collection.id} has no publishedAt`,
          );
        }
        return {
          id: collection.id,
          title: collection.title,
          description: collection.description,
          owner: collection.owner,
          publishedAt: collection.publishedAt.toISOString(),
          items: collection.items.map((item) => ({
            position: item.position,
            video: this.map(item.homeVideo),
          })),
        };
      }),
    };
  }

  private map(video: Awaited<ReturnType<HomeService['findRecord']>>) {
    if (!video.publishedAt) {
      throw new Error(`Published Home video ${video.id} has no publishedAt`);
    }
    const media = toPlayableMedia(
      video.videoAsset?.status === MediaStatus.READY ? video.videoAsset : null,
    );
    if (!media)
      throw new Error(`Published Home video ${video.id} is not playable`);
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      status: video.status,
      publishedAt: video.publishedAt.toISOString(),
      creator: video.creator,
      media,
      playable: { kind: 'HOME_VIDEO' as const, id: video.id, media },
      engagementTarget: { type: 'HOME_VIDEO' as const, id: video.id },
      likeCount: video.engagementTarget?.likeCount ?? 0,
      commentCount: video.engagementTarget?.commentCount ?? 0,
    };
  }

  private findRecord() {
    return this.database.client.homeVideo.findFirstOrThrow({
      include: homeInclude,
    });
  }
}
