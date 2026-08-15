import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DomainPublicationStatus, MediaStatus } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { toFeedItem } from '../feed/feed.mapper.js';
import type { HomeVideoDto } from './home.dto.js';

const publicationInclude = {
  series: {
    select: {
      id: true,
      title: true,
      _count: { select: { posts: true } },
    },
  },
  author: {
    select: {
      id: true,
      handle: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  media: {
    where: { asset: { status: MediaStatus.READY } },
    orderBy: { order: 'asc' as const },
    include: { asset: true },
  },
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
      include: { publication: { include: publicationInclude } },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 24,
    });
    return { items: videos.map((video) => this.map(video)) };
  }

  async findOne(id: string): Promise<HomeVideoDto> {
    const video = await this.database.client.homeVideo.findFirst({
      where: { id, status: DomainPublicationStatus.PUBLISHED },
      include: { publication: { include: publicationInclude } },
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
              include: { publication: { include: publicationInclude } },
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
    const publication = toFeedItem(video.publication);
    return {
      id: video.id,
      publicationId: video.publicationId,
      title: video.title,
      description: video.description,
      status: video.status,
      publishedAt: video.publishedAt.toISOString(),
      creator: publication.author,
      publication,
    };
  }

  private findRecord() {
    return this.database.client.homeVideo.findFirstOrThrow({
      include: { publication: { include: publicationInclude } },
    });
  }
}
