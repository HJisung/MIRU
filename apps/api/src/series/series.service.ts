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
  Prisma,
  SeriesSubmissionStatus,
  SeriesWorkType,
} from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { toPlayableMedia } from '../playback/playback.mapper.js';
import type { AuthUser } from '../auth/auth.service.js';
import type {
  CreateSeriesDto,
  CreateSeriesEpisodeDto,
  CreateSeriesSeasonDto,
  UpdateSeriesDto,
  UpdateSeriesEpisodeDto,
  UpdateSeriesSeasonDto,
} from './series.dto.js';
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
    include: { videoAsset: true, season: true },
    orderBy: { episodeNumber: 'asc' as const },
  },
} as const;

const managementInclude = {
  singleWorkAsset: { select: { status: true } },
  seasons: { orderBy: { seasonNumber: 'asc' as const } },
  episodes: {
    select: {
      id: true,
      publicationId: true,
      seasonId: true,
      episodeNumber: true,
      seasonEpisodeNumber: true,
      title: true,
      synopsis: true,
      publishedAt: true,
      videoAsset: { select: { status: true } },
    },
    orderBy: { episodeNumber: 'asc' as const },
  },
  submissions: {
    include: {
      reviewedBy: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

type ManagedSeriesRecord = Prisma.SeriesGetPayload<{
  include: typeof managementInclude;
}>;

type ReviewRecord = Prisma.SeriesSubmissionGetPayload<{
  include: {
    applicant: true;
    reviewedBy: true;
    series: { include: typeof managementInclude };
  };
}>;

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
      include: { videoAsset: true, season: true },
    });
    if (!episode) throw new NotFoundException('Series episode not found');
    return this.mapEpisode(episode);
  }

  async create(user: AuthUser, input: CreateSeriesDto) {
    const series = await this.database.client.series.create({
      data: {
        creatorId: user.id,
        title: input.title.trim(),
        synopsis: input.synopsis.trim(),
        description: input.description?.trim() ?? '',
        workType: input.workType,
        genres: this.cleanList(input.genres),
        tags: this.cleanList(input.tags),
        ageRating: input.ageRating?.trim() || null,
        productionInfo: input.productionInfo as Prisma.InputJsonValue,
        releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
      },
      include: managementInclude,
    });
    return this.mapManaged(series, user);
  }

  async mine(user: AuthUser) {
    const series = await this.database.client.series.findMany({
      where: { creatorId: user.id },
      include: managementInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return { items: series.map((item) => this.mapManaged(item, user)) };
  }

  async manage(user: AuthUser, id: string) {
    const series = await this.ownedSeries(user, id);
    return this.mapManaged(series, user);
  }

  async update(user: AuthUser, id: string, input: UpdateSeriesDto) {
    const series = await this.ownedSeries(user, id);
    const latest = series.submissions[0];
    if (series.publicationStatus !== DomainPublicationStatus.DRAFT)
      throw new BadRequestException('Only a draft Series can be edited');
    if (latest?.status === SeriesSubmissionStatus.APPROVED)
      throw new BadRequestException('Approved Series metadata is locked');
    if (
      input.workType &&
      input.workType !== series.workType &&
      (series.singleWorkAsset || series.episodes.length)
    )
      throw new BadRequestException(
        'Work type cannot change after playable content is attached',
      );
    const updated = await this.database.client.series.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        synopsis: input.synopsis?.trim(),
        description: input.description?.trim(),
        workType: input.workType,
        genres: input.genres ? this.cleanList(input.genres) : undefined,
        tags: input.tags ? this.cleanList(input.tags) : undefined,
        ageRating:
          input.ageRating === undefined
            ? undefined
            : input.ageRating?.trim() || null,
        productionInfo: input.productionInfo,
        releaseDate:
          input.releaseDate === undefined
            ? undefined
            : input.releaseDate
              ? new Date(input.releaseDate)
              : null,
      },
      include: managementInclude,
    });
    return this.mapManaged(updated, user);
  }

  async submit(user: AuthUser, id: string) {
    const series = await this.ownedSeries(user, id);
    const active = series.submissions.find(
      (submission) => submission.status === SeriesSubmissionStatus.SUBMITTED,
    );
    if (active) return this.mapSubmission(active);
    if (
      series.submissions.some(
        (submission) => submission.status === SeriesSubmissionStatus.APPROVED,
      )
    )
      throw new BadRequestException('Series is already approved');
    if (series.publicationStatus !== DomainPublicationStatus.DRAFT)
      throw new BadRequestException('Series is not ready for submission');
    if (!series.title.trim() || !series.synopsis.trim())
      throw new BadRequestException('Title and synopsis are required');
    try {
      const submission = await this.database.client.$transaction(async (tx) => {
        const created = await tx.seriesSubmission.create({
          data: {
            seriesId: series.id,
            applicantId: user.id,
            status: SeriesSubmissionStatus.SUBMITTED,
            submittedAt: new Date(),
          },
          include: { reviewedBy: true },
        });
        await tx.series.update({
          where: { id: series.id },
          data: { publicationStatus: DomainPublicationStatus.PENDING_REVIEW },
        });
        return created;
      });
      return this.mapSubmission(submission);
    } catch (error) {
      if (this.prismaCode(error) !== 'P2002') throw error;
      const existing = await this.database.client.seriesSubmission.findFirst({
        where: { seriesId: id, status: SeriesSubmissionStatus.SUBMITTED },
        include: { reviewedBy: true },
      });
      if (!existing) throw error;
      return this.mapSubmission(existing);
    }
  }

  async withdraw(user: AuthUser, seriesId: string, submissionId: string) {
    await this.ownedSeries(user, seriesId);
    const submission = await this.database.client.$transaction(async (tx) => {
      const changed = await tx.seriesSubmission.updateMany({
        where: {
          id: submissionId,
          seriesId,
          applicantId: user.id,
          status: SeriesSubmissionStatus.SUBMITTED,
        },
        data: { status: SeriesSubmissionStatus.WITHDRAWN },
      });
      if (!changed.count)
        throw new BadRequestException(
          'Only a submitted review can be withdrawn',
        );
      await tx.series.update({
        where: { id: seriesId },
        data: { publicationStatus: DomainPublicationStatus.DRAFT },
      });
      return tx.seriesSubmission.findUniqueOrThrow({
        where: { id: submissionId },
        include: { reviewedBy: true },
      });
    });
    return this.mapSubmission(submission);
  }

  async reviewQueue(user: AuthUser) {
    this.assertAdmin(user);
    const submissions = await this.database.client.seriesSubmission.findMany({
      where: { status: SeriesSubmissionStatus.SUBMITTED },
      include: {
        applicant: true,
        reviewedBy: true,
        series: { include: managementInclude },
      },
      orderBy: { submittedAt: 'asc' },
    });
    return { items: submissions.map((item) => this.mapReview(item, user)) };
  }

  async reviewDetail(user: AuthUser, submissionId: string) {
    this.assertAdmin(user);
    const submission = await this.database.client.seriesSubmission.findUnique({
      where: { id: submissionId },
      include: {
        applicant: true,
        reviewedBy: true,
        series: { include: managementInclude },
      },
    });
    if (!submission) throw new NotFoundException('Series submission not found');
    return this.mapReview(submission, user);
  }

  async review(
    user: AuthUser,
    submissionId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason: string,
  ) {
    this.assertAdmin(user);
    const decided = await this.database.client.$transaction(async (tx) => {
      const submission = await tx.seriesSubmission.findUnique({
        where: { id: submissionId },
      });
      if (!submission)
        throw new NotFoundException('Series submission not found');
      const changed = await tx.seriesSubmission.updateMany({
        where: {
          id: submission.id,
          status: SeriesSubmissionStatus.SUBMITTED,
        },
        data: {
          status: decision,
          reviewedById: user.id,
          reviewedAt: new Date(),
          decisionReason: reason.trim(),
        },
      });
      if (!changed.count)
        throw new BadRequestException(
          'Submission is no longer awaiting review',
        );
      await tx.series.update({
        where: { id: submission.seriesId },
        data: { publicationStatus: DomainPublicationStatus.DRAFT },
      });
      return submission.id;
    });
    return this.reviewDetail(user, decided);
  }

  async publish(user: AuthUser, id: string) {
    const series = await this.ownedSeries(user, id);
    if (series.publicationStatus === DomainPublicationStatus.PUBLISHED)
      return this.findOne(id);
    const approved = series.submissions.some(
      (submission) => submission.status === SeriesSubmissionStatus.APPROVED,
    );
    if (user.role !== 'ADMIN' && !approved)
      throw new ForbiddenException('Approved Series review is required');
    if (
      series.workType === SeriesWorkType.SINGLE_WORK &&
      series.singleWorkAsset?.status !== MediaStatus.READY
    )
      throw new BadRequestException('A ready single-work video is required');
    if (
      series.workType === SeriesWorkType.EPISODIC &&
      !series.episodes.some(
        (episode) => episode.videoAsset?.status === MediaStatus.READY,
      )
    )
      throw new BadRequestException(
        'At least one ready episode draft is required',
      );
    const publishedAt = new Date();
    await this.database.client.$transaction(async (tx) => {
      await tx.series.update({
        where: { id },
        data: { publicationStatus: DomainPublicationStatus.PUBLISHED },
      });
      if (
        series.workType === SeriesWorkType.SINGLE_WORK &&
        series.singleWorkPublicationId
      ) {
        await tx.post.update({
          where: { id: series.singleWorkPublicationId },
          data: { status: PostStatus.PUBLISHED, publishedAt },
        });
      }
    });
    return this.findOne(id);
  }

  async attachSingleWork(user: AuthUser, seriesId: string, assetId: string) {
    const series = await this.manageableSeries(user, seriesId);
    if (series.workType !== SeriesWorkType.SINGLE_WORK)
      throw new BadRequestException('Series is not a SINGLE_WORK');
    if (series.singleWorkAssetId === assetId) {
      return {
        id: series.id,
        assetId,
        status: series.publicationStatus,
      };
    }
    await this.database.client.$transaction(async (tx) => {
      await this.mediaAttachments.claimOwnedVideo(
        tx,
        user.id,
        assetId,
        MediaPurpose.LONG_VIDEO,
        [MediaStatus.READY],
        'SERIES_SINGLE',
      );
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
    const existing = await this.database.client.seriesEpisode.findFirst({
      where: { seriesId, videoAssetId: input.assetId },
      select: { id: true, videoAssetId: true, publishedAt: true },
    });
    if (existing) {
      return {
        id: existing.id,
        assetId: existing.videoAssetId!,
        status: existing.publishedAt
          ? DomainPublicationStatus.PUBLISHED
          : DomainPublicationStatus.DRAFT,
      };
    }
    if (!input.seasonId && input.seasonEpisodeNumber)
      throw new BadRequestException('Season episode number requires a Season');
    if (!input.title.trim())
      throw new BadRequestException('Episode title is required');
    let episode;
    try {
      episode = await this.database.client.$transaction(async (tx) => {
        await this.lockSeries(tx, seriesId);
        const lockedExisting = await tx.seriesEpisode.findFirst({
          where: { seriesId, videoAssetId: input.assetId },
          select: { id: true, videoAssetId: true },
        });
        if (lockedExisting) return { seriesEpisode: lockedExisting };
        if (input.seasonId) {
          const season = await tx.seriesSeason.findFirst({
            where: { id: input.seasonId, seriesId },
            select: { id: true },
          });
          if (!season)
            throw new BadRequestException('Season does not belong to Series');
        }
        await this.mediaAttachments.claimOwnedVideo(
          tx,
          user.id,
          input.assetId,
          MediaPurpose.LONG_VIDEO,
          [MediaStatus.READY],
          'SERIES_EPISODE',
        );
        return tx.post.create({
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
          select: {
            seriesEpisode: { select: { id: true, videoAssetId: true } },
          },
        });
      });
    } catch (error) {
      if (this.prismaCode(error) === 'P2002')
        throw new BadRequestException('Episode number is already in use');
      throw error;
    }
    if (!episode.seriesEpisode) throw new Error('Episode creation failed');
    return {
      id: episode.seriesEpisode.id,
      assetId: episode.seriesEpisode.videoAssetId!,
      status: DomainPublicationStatus.DRAFT,
    };
  }

  async createSeason(
    user: AuthUser,
    seriesId: string,
    input: CreateSeriesSeasonDto,
  ) {
    await this.manageableEpisodicSeries(user, seriesId);
    try {
      await this.database.client.seriesSeason.create({
        data: {
          seriesId,
          seasonNumber: input.seasonNumber,
          title: input.title?.trim() || null,
          description: input.description?.trim() ?? '',
        },
      });
    } catch (error) {
      if (this.prismaCode(error) === 'P2002')
        throw new BadRequestException('Season number is already in use');
      throw error;
    }
    return this.manage(user, seriesId);
  }

  async updateSeason(
    user: AuthUser,
    seriesId: string,
    seasonId: string,
    input: UpdateSeriesSeasonDto,
  ) {
    await this.manageableEpisodicSeries(user, seriesId);
    const season = await this.database.client.seriesSeason.findFirst({
      where: { id: seasonId, seriesId },
      select: { id: true },
    });
    if (!season) throw new NotFoundException('Series Season not found');
    try {
      await this.database.client.seriesSeason.update({
        where: { id: seasonId },
        data: {
          seasonNumber: input.seasonNumber,
          title:
            input.title === undefined ? undefined : input.title?.trim() || null,
          description: input.description?.trim(),
        },
      });
    } catch (error) {
      if (this.prismaCode(error) === 'P2002')
        throw new BadRequestException('Season number is already in use');
      throw error;
    }
    return this.manage(user, seriesId);
  }

  async deleteSeason(user: AuthUser, seriesId: string, seasonId: string) {
    await this.manageableEpisodicSeries(user, seriesId);
    await this.database.client.$transaction(async (tx) => {
      await this.lockSeries(tx, seriesId);
      const season = await tx.seriesSeason.findFirst({
        where: { id: seasonId, seriesId },
        select: { id: true, _count: { select: { episodes: true } } },
      });
      if (!season) throw new NotFoundException('Series Season not found');
      if (season._count.episodes)
        throw new BadRequestException(
          'Move or unassign Episodes before deleting this Season',
        );
      await tx.seriesSeason.delete({ where: { id: seasonId } });
    });
    return this.manage(user, seriesId);
  }

  async updateEpisode(
    user: AuthUser,
    seriesId: string,
    episodeId: string,
    input: UpdateSeriesEpisodeDto,
  ) {
    await this.manageableEpisodicSeries(user, seriesId);
    try {
      await this.database.client.$transaction(async (tx) => {
        await this.lockSeries(tx, seriesId);
        const episode = await tx.seriesEpisode.findFirst({
          where: { id: episodeId, seriesId },
        });
        if (!episode) throw new NotFoundException('Series Episode not found');
        const targetSeasonId =
          input.seasonId === undefined ? episode.seasonId : input.seasonId;
        if (targetSeasonId) {
          const season = await tx.seriesSeason.findFirst({
            where: { id: targetSeasonId, seriesId },
            select: { id: true },
          });
          if (!season)
            throw new BadRequestException('Season does not belong to Series');
        }
        const targetSeasonEpisodeNumber = !targetSeasonId
          ? null
          : input.seasonEpisodeNumber === undefined
            ? input.seasonId !== undefined &&
              input.seasonId !== episode.seasonId
              ? null
              : episode.seasonEpisodeNumber
            : input.seasonEpisodeNumber;
        const title = input.title?.trim();
        if (input.title !== undefined && !title)
          throw new BadRequestException('Episode title is required');
        await tx.seriesEpisode.update({
          where: { id: episodeId },
          data: {
            title,
            synopsis: input.synopsis?.trim(),
            episodeNumber: input.episodeNumber,
            seasonId: input.seasonId,
            seasonEpisodeNumber: targetSeasonEpisodeNumber,
          },
        });
        if (input.title !== undefined || input.synopsis !== undefined) {
          await tx.post.update({
            where: { id: episode.publicationId },
            data: { title, caption: input.synopsis?.trim() },
          });
        }
      });
    } catch (error) {
      if (this.prismaCode(error) === 'P2002')
        throw new BadRequestException('Episode number is already in use');
      throw error;
    }
    return this.manage(user, seriesId);
  }

  async reorderEpisodes(
    user: AuthUser,
    seriesId: string,
    episodeIds: string[],
  ) {
    await this.manageableEpisodicSeries(user, seriesId);
    if (new Set(episodeIds).size !== episodeIds.length)
      throw new BadRequestException('Episode order contains duplicates');
    await this.database.client.$transaction(async (tx) => {
      await this.lockSeries(tx, seriesId);
      const episodes = await tx.seriesEpisode.findMany({
        where: { seriesId },
        select: { id: true, episodeNumber: true },
      });
      const expected = new Set(episodes.map((episode) => episode.id));
      if (
        episodeIds.length !== episodes.length ||
        episodeIds.some((id) => !expected.has(id))
      )
        throw new BadRequestException(
          'Episode order must contain every Series Episode exactly once',
        );
      const temporaryBase =
        Math.max(0, ...episodes.map((episode) => episode.episodeNumber)) +
        episodes.length;
      for (const [index, id] of episodeIds.entries()) {
        await tx.seriesEpisode.update({
          where: { id },
          data: { episodeNumber: temporaryBase + index + 1 },
        });
      }
      for (const [index, id] of episodeIds.entries()) {
        await tx.seriesEpisode.update({
          where: { id },
          data: { episodeNumber: index + 1 },
        });
      }
    });
    return this.manage(user, seriesId);
  }

  async publishEpisode(user: AuthUser, episodeId: string) {
    const episode = await this.database.client.seriesEpisode.findUnique({
      where: { id: episodeId },
      include: { series: { include: { submissions: true } }, videoAsset: true },
    });
    if (!episode) throw new NotFoundException('Series episode not found');
    this.assertSeriesManager(user, episode.series);
    if (episode.series.workType !== SeriesWorkType.EPISODIC)
      throw new BadRequestException('Series is not EPISODIC');
    if (episode.series.publicationStatus !== DomainPublicationStatus.PUBLISHED)
      throw new BadRequestException('Series must be published first');
    if (episode.videoAsset?.status !== MediaStatus.READY)
      throw new BadRequestException('Episode video is not ready');
    await this.database.client.$transaction(async (tx) => {
      await this.lockSeries(tx, episode.seriesId);
      const current = await tx.seriesEpisode.findUniqueOrThrow({
        where: { id: episode.id },
        select: { publishedAt: true },
      });
      if (current.publishedAt) return;
      const publishedAt = new Date();
      await tx.seriesEpisode.update({
        where: { id: episode.id },
        data: { publishedAt },
      });
      await tx.post.update({
        where: { id: episode.publicationId },
        data: { status: PostStatus.PUBLISHED, publishedAt },
      });
    });
    return this.findEpisode(episode.id);
  }

  async unpublishEpisode(user: AuthUser, episodeId: string) {
    const episode = await this.database.client.seriesEpisode.findUnique({
      where: { id: episodeId },
      include: { series: { include: { submissions: true } } },
    });
    if (!episode) throw new NotFoundException('Series episode not found');
    this.assertSeriesManager(user, episode.series);
    if (episode.series.workType !== SeriesWorkType.EPISODIC)
      throw new BadRequestException('Series is not EPISODIC');
    await this.database.client.$transaction(async (tx) => {
      await this.lockSeries(tx, episode.seriesId);
      const current = await tx.seriesEpisode.findUniqueOrThrow({
        where: { id: episodeId },
        select: { publishedAt: true },
      });
      if (!current.publishedAt) return;
      if (
        episode.series.publicationStatus === DomainPublicationStatus.PUBLISHED
      ) {
        const publishedCount = await tx.seriesEpisode.count({
          where: { seriesId: episode.seriesId, publishedAt: { not: null } },
        });
        if (publishedCount <= 1)
          throw new BadRequestException(
            'A published Series must keep at least one published Episode',
          );
      }
      await tx.seriesEpisode.update({
        where: { id: episodeId },
        data: { publishedAt: null },
      });
      await tx.post.update({
        where: { id: episode.publicationId },
        data: { status: PostStatus.DRAFT, publishedAt: null },
      });
    });
    return this.managedEpisode(episodeId);
  }

  private async ownedSeries(user: AuthUser, id: string) {
    const series = await this.database.client.series.findFirst({
      where: { id, creatorId: user.id },
      include: managementInclude,
    });
    if (!series) throw new NotFoundException('Series not found');
    return series;
  }

  private mapManaged(series: ManagedSeriesRecord, user: AuthUser) {
    const submissions = series.submissions.map((submission) =>
      this.mapSubmission(submission),
    );
    const approved = series.submissions.some(
      (submission) => submission.status === SeriesSubmissionStatus.APPROVED,
    );
    const hasPlayableContent =
      series.workType === SeriesWorkType.SINGLE_WORK
        ? series.singleWorkAsset?.status === MediaStatus.READY
        : series.episodes.some(
            (episode) => episode.videoAsset?.status === MediaStatus.READY,
          );
    return {
      id: series.id,
      title: series.title,
      synopsis: series.synopsis,
      description: series.description,
      workType: series.workType,
      publicationStatus: series.publicationStatus,
      genres: series.genres,
      tags: series.tags,
      ageRating: series.ageRating,
      productionInfo: series.productionInfo,
      releaseDate: series.releaseDate?.toISOString() ?? null,
      hasPlayableContent,
      canManageContent: user.role === 'ADMIN' || approved,
      createdAt: series.createdAt.toISOString(),
      updatedAt: series.updatedAt.toISOString(),
      submissions,
      latestSubmission: submissions[0] ?? null,
      seasons: series.seasons.map((season) => ({
        id: season.id,
        seasonNumber: season.seasonNumber,
        title: season.title,
        description: season.description,
      })),
      episodes: series.episodes.map((episode) =>
        this.mapManagedEpisode(episode),
      ),
    };
  }

  private mapSubmission(submission: {
    id: string;
    status: SeriesSubmissionStatus;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    decisionReason: string | null;
    reviewedBy?: {
      id: string;
      handle: string;
      displayName: string;
      avatarUrl: string | null;
    } | null;
  }) {
    return {
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt?.toISOString() ?? null,
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
      decisionReason: submission.decisionReason,
      reviewer: submission.reviewedBy
        ? {
            id: submission.reviewedBy.id,
            handle: submission.reviewedBy.handle,
            displayName: submission.reviewedBy.displayName,
            avatarUrl: submission.reviewedBy.avatarUrl,
          }
        : null,
    };
  }

  private mapReview(submission: ReviewRecord, user: AuthUser) {
    return {
      ...this.mapSubmission(submission),
      applicant: {
        id: submission.applicant.id,
        handle: submission.applicant.handle,
        displayName: submission.applicant.displayName,
        avatarUrl: submission.applicant.avatarUrl,
      },
      series: this.mapManaged(submission.series, user),
    };
  }

  private assertAdmin(user: AuthUser) {
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('Administrator role required');
  }

  private cleanList(values?: string[]) {
    return [
      ...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
    ].slice(0, 20);
  }

  private prismaCode(error: unknown) {
    return typeof error === 'object' && error
      ? (error as { code?: unknown }).code
      : undefined;
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

  private async manageableEpisodicSeries(user: AuthUser, id: string) {
    const series = await this.manageableSeries(user, id);
    if (series.workType !== SeriesWorkType.EPISODIC)
      throw new BadRequestException('Series is not EPISODIC');
    return series;
  }

  private mapManagedEpisode(episode: {
    id: string;
    seasonId: string | null;
    episodeNumber: number;
    seasonEpisodeNumber: number | null;
    title: string;
    synopsis: string;
    publishedAt: Date | null;
    videoAsset: { status: MediaStatus } | null;
  }) {
    return {
      id: episode.id,
      seasonId: episode.seasonId,
      episodeNumber: episode.episodeNumber,
      seasonEpisodeNumber: episode.seasonEpisodeNumber,
      title: episode.title,
      synopsis: episode.synopsis,
      mediaStatus: episode.videoAsset?.status ?? MediaStatus.FAILED,
      publishedAt: episode.publishedAt?.toISOString() ?? null,
      isPublished: Boolean(episode.publishedAt),
    };
  }

  private async managedEpisode(episodeId: string) {
    const episode = await this.database.client.seriesEpisode.findUniqueOrThrow({
      where: { id: episodeId },
      include: { videoAsset: { select: { status: true } } },
    });
    return this.mapManagedEpisode(episode);
  }

  private async lockSeries(tx: Prisma.TransactionClient, seriesId: string) {
    await tx.$queryRaw`SELECT 1 AS "locked" FROM (SELECT pg_advisory_xact_lock(hashtextextended(${seriesId}, 0))) AS series_lock`;
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
    seasonId: string | null;
    season?: {
      seasonNumber: number;
      title: string | null;
      description: string;
    } | null;
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
      seasonId: episode.seasonId,
      seasonNumber: episode.season?.seasonNumber ?? null,
      seasonTitle: episode.season?.title ?? null,
      seasonDescription: episode.season?.description ?? null,
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
