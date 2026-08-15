import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DomainPublicationStatus, MediaStatus } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { toFeedItem } from '../feed/feed.mapper.js';

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

const seriesInclude = {
  creator: {
    select: {
      id: true,
      handle: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  episodes: {
    include: { publication: { include: publicationInclude } },
    orderBy: { episodeNumber: 'asc' as const },
  },
} as const;

@Injectable()
export class SeriesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async list() {
    const works = await this.database.client.series.findMany({
      where: { publicationStatus: DomainPublicationStatus.PUBLISHED },
      include: seriesInclude,
      orderBy: [{ releaseDate: 'desc' }, { id: 'desc' }],
    });
    return { items: works.map((work) => this.map(work)) };
  }

  async findOne(id: string) {
    const work = await this.database.client.series.findFirst({
      where: { id, publicationStatus: DomainPublicationStatus.PUBLISHED },
      include: seriesInclude,
    });
    if (!work) throw new NotFoundException('Series not found');
    return this.map(work);
  }

  private map(work: Awaited<ReturnType<SeriesService['findRecord']>>) {
    return {
      id: work.id,
      title: work.title,
      synopsis: work.synopsis,
      workType: work.workType,
      publicationStatus: work.publicationStatus,
      genres: work.genres,
      tags: work.tags,
      ageRating: work.ageRating,
      releaseDate: work.releaseDate?.toISOString() ?? null,
      creator: work.creator,
      episodes: work.episodes.map((episode) => ({
        id: episode.id,
        episodeNumber: episode.episodeNumber,
        seasonEpisodeNumber: episode.seasonEpisodeNumber,
        title: episode.title,
        synopsis: episode.synopsis,
        publishedAt: episode.publishedAt?.toISOString() ?? null,
        publication: toFeedItem(episode.publication),
      })),
    };
  }

  private findRecord() {
    return this.database.client.series.findFirstOrThrow({
      include: seriesInclude,
    });
  }
}
