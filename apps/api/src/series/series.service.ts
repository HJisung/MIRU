import {
  BadRequestException,
  ForbiddenException,
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
  SeriesSubmissionStatus,
  SeriesWorkType,
} from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { toPlayableMedia } from '../playback/playback.mapper.js';
import type { AuthUser } from '../auth/auth.service.js';
import type { CreateSeriesEpisodeDto } from './series.dto.js';
import { MediaAttachmentService } from '../media/media-attachment.service.js';

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
    @Inject(MediaAttachmentService)
    private readonly mediaAttachments: MediaAttachmentService,
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

  async attachSingleWork(user: AuthUser, seriesId: string, assetId: string) {
    const series = await this.manageableSeries(user, seriesId);
    if (series.workType !== SeriesWorkType.SINGLE_WORK)
      throw new BadRequestException('Series is not a SINGLE_WORK');
    await this.mediaAttachments.readyUnlinkedOwnedVideo(
      user.id,
      assetId,
      MediaPurpose.LONG_VIDEO,
    );

    await this.database.client.$transaction(async (tx) => {
      let publicationId = series.singleWorkPublicationId;
      if (!publicationId) {
        const publication = await tx.post.create({
          data: {
            authorId: user.id,
            format: PostFormat.LONG_VIDEO,
            status:
              series.publicationStatus === DomainPublicationStatus.PUBLISHED
                ? PostStatus.PUBLISHED
                : PostStatus.DRAFT,
            visibility: PostVisibility.PUBLIC,
            title: series.title,
            caption: series.synopsis,
            publishedAt:
              series.publicationStatus === DomainPublicationStatus.PUBLISHED
                ? new Date()
                : null,
            media: { create: { assetId, order: 0 } },
          },
        });
        publicationId = publication.id;
      } else {
        await tx.postMedia.deleteMany({ where: { postId: publicationId } });
        await tx.postMedia.create({
          data: { postId: publicationId, assetId, order: 0 },
        });
      }
      await tx.series.update({
        where: { id: series.id },
        data: {
          singleWorkAssetId: assetId,
          singleWorkPublicationId: publicationId,
        },
      });
    });
    return {
      id: series.id,
      assetId,
      status: series.publicationStatus,
    };
  }

  async createEpisode(
    user: AuthUser,
    seriesId: string,
    input: CreateSeriesEpisodeDto,
  ) {
    const series = await this.manageableSeries(user, seriesId);
    if (series.workType !== SeriesWorkType.EPISODIC)
      throw new BadRequestException('Series is not EPISODIC');
    await this.mediaAttachments.readyUnlinkedOwnedVideo(
      user.id,
      input.assetId,
      MediaPurpose.LONG_VIDEO,
    );
    if (input.seasonId) {
      const season = await this.database.client.seriesSeason.findFirst({
        where: { id: input.seasonId, seriesId },
      });
      if (!season)
        throw new BadRequestException('Season does not belong to Series');
    }
    const episode = await this.database.client.post.create({
      data: {
        authorId: user.id,
        format: PostFormat.LONG_VIDEO,
        status: PostStatus.DRAFT,
        visibility: PostVisibility.PUBLIC,
        title: input.title.trim(),
        caption: input.synopsis.trim(),
        media: { create: { assetId: input.assetId, order: 0 } },
        seriesEpisode: {
          create: {
            seriesId,
            seasonId: input.seasonId,
            videoAssetId: input.assetId,
            episodeNumber: input.episodeNumber,
            seasonEpisodeNumber: input.seasonEpisodeNumber,
            title: input.title.trim(),
            synopsis: input.synopsis.trim(),
          },
        },
      },
      select: { seriesEpisode: { select: { id: true, videoAssetId: true } } },
    });
    if (!episode.seriesEpisode) throw new Error('Episode creation failed');
    return {
      id: episode.seriesEpisode.id,
      assetId: episode.seriesEpisode.videoAssetId!,
      status: DomainPublicationStatus.DRAFT,
    };
  }

  async publishEpisode(user: AuthUser, episodeId: string) {
    const episode = await this.database.client.seriesEpisode.findUnique({
      where: { id: episodeId },
      include: { series: { include: { submissions: true } }, videoAsset: true },
    });
    if (!episode) throw new NotFoundException('Series episode not found');
    this.assertSeriesManager(user, episode.series);
    if (episode.series.publicationStatus !== DomainPublicationStatus.PUBLISHED)
      throw new BadRequestException('Series must be published first');
    if (episode.videoAsset?.status !== MediaStatus.READY)
      throw new BadRequestException('Episode video is not ready');
    const publishedAt = new Date();
    await this.database.client.$transaction([
      this.database.client.seriesEpisode.update({
        where: { id: episode.id },
        data: { publishedAt },
      }),
      this.database.client.post.update({
        where: { id: episode.publicationId },
        data: { status: PostStatus.PUBLISHED, publishedAt },
      }),
    ]);
    return this.findEpisode(episode.id);
  }

  private async manageableSeries(user: AuthUser, id: string) {
    const series = await this.database.client.series.findUnique({
      where: { id },
      include: { submissions: true },
    });
    if (!series) throw new NotFoundException('Series not found');
    this.assertSeriesManager(user, series);
    return series;
  }

  private assertSeriesManager(
    user: AuthUser,
    series: {
      creatorId: string;
      submissions: Array<{
        applicantId: string;
        status: SeriesSubmissionStatus;
      }>;
    },
  ) {
    const approved = series.submissions.some(
      (submission) =>
        submission.applicantId === user.id &&
        submission.status === SeriesSubmissionStatus.APPROVED,
    );
    if (series.creatorId !== user.id || (user.role !== 'ADMIN' && !approved))
      throw new ForbiddenException('Approved Series management is required');
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
      engagementTarget:
        work.workType === 'SINGLE_WORK'
          ? { type: 'SERIES' as const, id: work.id }
          : null,
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
