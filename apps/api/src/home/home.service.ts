import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DomainPublicationStatus, MediaStatus } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { toPlayableMedia } from '../playback/playback.mapper.js';
import type { HomeVideoDto } from './home.dto.js';

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
