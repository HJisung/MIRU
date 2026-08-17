import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DomainPublicationStatus,
  MediaPurpose,
  MediaStatus,
  PostFormat,
  PostStatus,
  PostVisibility,
} from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
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
  publication: { select: { likeCount: true, commentCount: true } },
} as const;

@Injectable()
export class HomeService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
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
    const asset = await this.database.client.mediaAsset.findFirst({
      where: {
        id: input.assetId,
        ownerId: userId,
        kind: 'VIDEO',
        purpose: MediaPurpose.LONG_VIDEO,
        status: {
          in: [MediaStatus.UPLOADED, MediaStatus.PROCESSING, MediaStatus.READY],
        },
        homeVideos: { none: {} },
      },
    });
    if (!asset)
      throw new NotFoundException('Processable unlinked video asset not found');
    const created = await this.database.client.post.create({
      data: {
        authorId: userId,
        format: PostFormat.LONG_VIDEO,
        status: PostStatus.DRAFT,
        visibility: PostVisibility.PUBLIC,
        title: input.title.trim(),
        caption: input.description.trim(),
        media: { create: { assetId: asset.id, order: 0 } },
        homeVideo: {
          create: {
            creatorId: userId,
            videoAssetId: asset.id,
            title: input.title.trim(),
            description: input.description.trim(),
          },
        },
      },
      select: {
        homeVideo: { select: { id: true, status: true, videoAssetId: true } },
      },
    });
    if (!created.homeVideo) throw new Error('Home video creation failed');
    return {
      id: created.homeVideo.id,
      status: created.homeVideo.status,
      assetId: created.homeVideo.videoAssetId,
    };
  }

  async publish(userId: string, id: string) {
    const record = await this.database.client.homeVideo.findFirst({
      where: {
        id,
        creatorId: userId,
        status: DomainPublicationStatus.DRAFT,
        videoAsset: { status: MediaStatus.READY },
      },
      select: { publicationId: true },
    });
    if (!record)
      throw new NotFoundException('Ready Home video draft not found');
    const publishedAt = new Date();
    await this.database.client.$transaction([
      this.database.client.homeVideo.update({
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
      likeCount: video.publication.likeCount,
      commentCount: video.publication.commentCount,
    };
  }

  private findRecord() {
    return this.database.client.homeVideo.findFirstOrThrow({
      include: homeInclude,
    });
  }
}
