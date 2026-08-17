import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DomainPublicationStatus, MediaStatus } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { toPlayableMedia } from '../playback/playback.mapper.js';

const seriesInclude = {
  creator: {
    select: {
      id: true,
      handle: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  singleWorkAsset: true,
  episodes: {
    include: { videoAsset: true },
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

  async findEpisode(id: string) {
    const episode = await this.database.client.seriesEpisode.findFirst({
      where: {
        id,
        publishedAt: { not: null },
        series: { publicationStatus: DomainPublicationStatus.PUBLISHED },
      },
      include: { videoAsset: true },
    });
    if (!episode) throw new NotFoundException('Series episode not found');
    return this.mapEpisode(episode);
  }

  private map(work: Awaited<ReturnType<SeriesService['findRecord']>>) {
    const singleMedia = toPlayableMedia(
      work.singleWorkAsset?.status === MediaStatus.READY
        ? work.singleWorkAsset
        : null,
    );
    if (work.workType === 'SINGLE_WORK' && !singleMedia) {
      throw new Error(`Published single work ${work.id} is not playable`);
    }
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
      singleWork: singleMedia
        ? { kind: 'SERIES' as const, id: work.id, media: singleMedia }
        : null,
      engagementTarget: { type: 'SERIES' as const, id: work.id },
      episodes: work.episodes
        .filter((episode) => episode.publishedAt)
        .map((episode) => this.mapEpisode(episode)),
    };
  }

  private mapEpisode(episode: {
    id: string;
    seriesId: string;
    episodeNumber: number;
    seasonEpisodeNumber: number | null;
    title: string;
    synopsis: string;
    publishedAt: Date | null;
    videoAsset:
      | (Parameters<typeof toPlayableMedia>[0] & {
          status: MediaStatus;
        })
      | null;
  }) {
    const media = toPlayableMedia(
      episode.videoAsset?.status === MediaStatus.READY
        ? episode.videoAsset
        : null,
    );
    return {
      id: episode.id,
      seriesId: episode.seriesId,
      episodeNumber: episode.episodeNumber,
      seasonEpisodeNumber: episode.seasonEpisodeNumber,
      title: episode.title,
      synopsis: episode.synopsis,
      publishedAt: episode.publishedAt?.toISOString() ?? null,
      media,
      playable: media
        ? { kind: 'SERIES_EPISODE' as const, id: episode.id, media }
        : null,
      engagementTarget: { type: 'SERIES_EPISODE' as const, id: episode.id },
    };
  }

  private findRecord() {
    return this.database.client.series.findFirstOrThrow({
      include: seriesInclude,
    });
  }
}
