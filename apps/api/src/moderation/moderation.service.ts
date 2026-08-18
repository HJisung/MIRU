import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DomainPublicationStatus,
  ModerationAuditAction,
  ModerationTargetStatus,
  PostStatus,
  ReportStatus,
  SeriesWorkType,
  type Prisma,
} from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { EngagementTargetService } from '../engagement/engagement-target.service.js';
import type {
  CreateReportDto,
  ModerationQueueQueryDto,
} from './moderation.dto.js';

const reportInclude = {
  reporter: {
    select: { id: true, handle: true, displayName: true, avatarUrl: true },
  },
  target: {
    include: {
      homeVideo: { include: { creator: true } },
      series: { include: { creator: true } },
      seriesEpisode: { include: { series: { include: { creator: true } } } },
      shortForm: { include: { creator: true } },
      communityPost: { include: { author: true } },
    },
  },
} as const;

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(EngagementTargetService)
    private readonly targets: EngagementTargetService,
  ) {}

  report(reporterId: string, targetId: string, input: CreateReportDto) {
    return this.database.client.$transaction(async (tx) => {
      await this.targets.lockActiveTarget(tx, targetId);
      return tx.engagementReport.upsert({
        where: { reporterId_targetId: { reporterId, targetId } },
        create: {
          reporterId,
          targetId,
          reason: input.reason,
          details: input.details?.trim() ?? '',
        },
        update: {
          reason: input.reason,
          details: input.details?.trim() ?? '',
          status: ReportStatus.OPEN,
        },
        select: { id: true, status: true, createdAt: true },
      });
    });
  }

  async reportLegacy(
    reporterId: string,
    postId: string,
    input: CreateReportDto,
  ) {
    const post = await this.database.client.post.findFirst({
      where: { id: postId, status: PostStatus.PUBLISHED },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return this.database.client.report.upsert({
      where: { reporterId_postId: { reporterId, postId } },
      create: {
        reporterId,
        postId,
        reason: input.reason,
        details: input.details?.trim() ?? '',
      },
      update: {
        reason: input.reason,
        details: input.details?.trim() ?? '',
        status: ReportStatus.OPEN,
      },
      select: { id: true, status: true, createdAt: true },
    });
  }

  async queue(query: ModerationQueueQueryDto) {
    const take = query.limit ?? 25;
    const reports = await this.database.client.engagementReport.findMany({
      where: {
        status: query.status,
        reason: query.reason,
        target: query.targetType ? { type: query.targetType } : undefined,
      },
      include: reportInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const page = reports.slice(0, take);
    return {
      items: page.map((report) => this.mapReport(report)),
      nextCursor: reports.length > take ? (page.at(-1)?.id ?? null) : null,
    };
  }

  legacyQueue() {
    return this.database.client.report.findMany({
      where: {
        status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] },
        post: {
          homeVideo: null,
          seriesSingleWork: null,
          seriesEpisode: null,
          shortForm: null,
          communityPost: null,
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        reporter: { select: { id: true, handle: true } },
        post: { select: { id: true, caption: true, authorId: true } },
      },
    });
  }

  async detail(reportId: string) {
    const report = await this.database.client.engagementReport.findUnique({
      where: { id: reportId },
      include: {
        ...reportInclude,
        auditLogs: {
          include: {
            actor: {
              select: {
                id: true,
                handle: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: 100,
        },
      },
    });
    if (!report) throw new NotFoundException('Report not found');
    return {
      ...this.mapReport(report),
      audit: report.auditLogs.map((entry) => ({
        id: entry.id,
        action: entry.action,
        previousStatus: entry.previousStatus,
        resultingStatus: entry.resultingStatus,
        note: entry.note,
        createdAt: entry.createdAt.toISOString(),
        actor: entry.actor,
      })),
    };
  }

  review(actorId: string, reportId: string, note: string) {
    return this.transition(
      actorId,
      reportId,
      ReportStatus.REVIEWING,
      ModerationAuditAction.REVIEW_STARTED,
      note,
    );
  }

  dismiss(actorId: string, reportId: string, note: string) {
    return this.transition(
      actorId,
      reportId,
      ReportStatus.DISMISSED,
      ModerationAuditAction.REPORT_DISMISSED,
      note,
    );
  }

  async removeContent(actorId: string, reportId: string, note: string) {
    await this.database.client.$transaction(async (tx) => {
      const reportTarget = await tx.engagementReport.findUnique({
        where: { id: reportId },
        select: { targetId: true },
      });
      if (!reportTarget) throw new NotFoundException('Report not found');
      const locked = await tx.$queryRaw<{ moderationStatus: string }[]>`
        SELECT "moderationStatus"::text FROM "EngagementTarget" WHERE "id" = ${reportTarget.targetId}::uuid FOR UPDATE`;
      if (locked[0]?.moderationStatus !== ModerationTargetStatus.ACTIVE)
        throw new ConflictException('Content is already removed');
      const report = await this.lockReport(tx, reportId);
      this.assertActionable(report.status);
      const target = await tx.engagementTarget.findUnique({
        where: { id: report.targetId },
        include: {
          homeVideo: { select: { id: true } },
          series: { select: { id: true } },
          seriesEpisode: {
            select: { id: true, seriesId: true },
          },
          shortForm: { select: { id: true } },
          communityPost: { select: { id: true } },
        },
      });
      if (!target) throw new NotFoundException('Engagement target not found');
      if (target.series) await this.lockSeries(tx, target.series.id);
      if (target.seriesEpisode)
        await this.lockSeries(tx, target.seriesEpisode.seriesId);
      const removedAt = new Date();
      await tx.engagementTarget.update({
        where: { id: target.id },
        data: {
          moderationStatus: ModerationTargetStatus.REMOVED,
          removedAt,
          removedById: actorId,
        },
      });
      if (target.homeVideo) {
        await tx.homeVideo.update({
          where: { id: target.homeVideo.id },
          data: { status: DomainPublicationStatus.REMOVED, publishedAt: null },
        });
      } else if (target.shortForm) {
        await tx.shortForm.update({
          where: { id: target.shortForm.id },
          data: { status: DomainPublicationStatus.REMOVED, publishedAt: null },
        });
      } else if (target.communityPost) {
        await tx.communityPost.update({
          where: { id: target.communityPost.id },
          data: { status: DomainPublicationStatus.REMOVED, publishedAt: null },
        });
      } else if (target.series) {
        await this.removeSeries(tx, target.series.id, actorId, removedAt);
      } else if (target.seriesEpisode) {
        await this.removeEpisode(tx, target.seriesEpisode, actorId, removedAt);
      }
      await tx.engagementReport.update({
        where: { id: report.id },
        data: { status: ReportStatus.RESOLVED },
      });
      await tx.moderationAuditLog.create({
        data: {
          actorId,
          reportId: report.id,
          targetId: report.targetId,
          action: ModerationAuditAction.CONTENT_REMOVED,
          previousStatus: report.status,
          resultingStatus: ReportStatus.RESOLVED,
          note: note.trim(),
        },
      });
    });
    return this.detail(reportId);
  }

  private async transition(
    actorId: string,
    reportId: string,
    next: ReportStatus,
    action: ModerationAuditAction,
    note: string,
  ) {
    await this.database.client.$transaction(async (tx) => {
      const reportTarget = await tx.engagementReport.findUnique({
        where: { id: reportId },
        select: { targetId: true },
      });
      if (!reportTarget) throw new NotFoundException('Report not found');
      await tx.$queryRaw`
        SELECT "id" FROM "EngagementTarget" WHERE "id" = ${reportTarget.targetId}::uuid FOR UPDATE`;
      const report = await this.lockReport(tx, reportId);
      const allowed =
        next === ReportStatus.REVIEWING
          ? report.status === ReportStatus.OPEN
          : report.status === ReportStatus.OPEN ||
            report.status === ReportStatus.REVIEWING;
      if (!allowed)
        throw new ConflictException(
          'Report state no longer permits this action',
        );
      await tx.engagementReport.update({
        where: { id: report.id },
        data: { status: next },
      });
      await tx.moderationAuditLog.create({
        data: {
          actorId,
          reportId: report.id,
          targetId: report.targetId,
          action,
          previousStatus: report.status,
          resultingStatus: next,
          note: note.trim(),
        },
      });
    });
    return this.detail(reportId);
  }

  private async lockReport(tx: Prisma.TransactionClient, reportId: string) {
    const rows = await tx.$queryRaw<
      { id: string; targetId: string; status: ReportStatus }[]
    >`
      SELECT "id", "targetId", "status" FROM "EngagementReport" WHERE "id" = ${reportId}::uuid FOR UPDATE`;
    if (!rows[0]) throw new NotFoundException('Report not found');
    return rows[0];
  }

  private assertActionable(status: ReportStatus) {
    if (status !== ReportStatus.OPEN && status !== ReportStatus.REVIEWING)
      throw new ConflictException('Report state no longer permits this action');
  }

  private async lockSeries(tx: Prisma.TransactionClient, seriesId: string) {
    await tx.$queryRaw`SELECT 1 AS "locked" FROM (SELECT pg_advisory_xact_lock(hashtextextended(${seriesId}, 0))) AS series_lock`;
  }

  private async removeSeries(
    tx: Prisma.TransactionClient,
    seriesId: string,
    actorId: string,
    removedAt: Date,
  ) {
    await tx.series.update({
      where: { id: seriesId },
      data: {
        publicationStatus: DomainPublicationStatus.REMOVED,
        publishedAt: null,
      },
    });
    await tx.seriesEpisode.updateMany({
      where: { seriesId },
      data: { publishedAt: null },
    });
    await tx.engagementTarget.updateMany({
      where: { seriesId },
      data: {
        moderationStatus: ModerationTargetStatus.REMOVED,
        removedAt,
        removedById: actorId,
      },
    });
  }

  private async removeEpisode(
    tx: Prisma.TransactionClient,
    episode: { id: string; seriesId: string },
    actorId: string,
    removedAt: Date,
  ) {
    const series = await tx.series.findUniqueOrThrow({
      where: { id: episode.seriesId },
      select: { publicationStatus: true, workType: true },
    });
    const publishedCount = await tx.seriesEpisode.count({
      where: { seriesId: episode.seriesId, publishedAt: { not: null } },
    });
    if (
      series.workType === SeriesWorkType.EPISODIC &&
      series.publicationStatus === DomainPublicationStatus.PUBLISHED &&
      publishedCount <= 1
    ) {
      await tx.engagementTarget.updateMany({
        where: { seriesId: episode.seriesId },
        data: {
          moderationStatus: ModerationTargetStatus.REMOVED,
          removedAt,
          removedById: actorId,
        },
      });
      await this.removeSeries(tx, episode.seriesId, actorId, removedAt);
      return;
    }
    await tx.seriesEpisode.update({
      where: { id: episode.id },
      data: { publishedAt: null },
    });
  }

  private mapReport(
    report: Prisma.EngagementReportGetPayload<{
      include: typeof reportInclude;
    }>,
  ) {
    const target = report.target;
    const content = target.homeVideo
      ? {
          title: target.homeVideo.title,
          body: target.homeVideo.description,
          author: target.homeVideo.creator,
        }
      : target.series
        ? {
            title: target.series.title,
            body: target.series.synopsis,
            author: target.series.creator,
          }
        : target.seriesEpisode
          ? {
              title: target.seriesEpisode.title,
              body: target.seriesEpisode.synopsis,
              author: target.seriesEpisode.series.creator,
            }
          : target.shortForm
            ? {
                title: target.shortForm.title,
                body: target.shortForm.description,
                author: target.shortForm.creator,
              }
            : target.communityPost
              ? {
                  title: null,
                  body: target.communityPost.body,
                  author: target.communityPost.author,
                }
              : null;
    if (!content)
      throw new Error(`Engagement target ${target.id} has no product`);
    return {
      id: report.id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      reporter: report.reporter,
      target: { type: target.type, id: this.productId(target) },
      moderationStatus: target.moderationStatus,
      content,
    };
  }

  private productId(target: {
    homeVideoId: string | null;
    seriesId: string | null;
    seriesEpisodeId: string | null;
    shortFormId: string | null;
    communityPostId: string | null;
  }) {
    const id =
      target.homeVideoId ??
      target.seriesId ??
      target.seriesEpisodeId ??
      target.shortFormId ??
      target.communityPostId;
    if (!id) throw new Error('Engagement target has no product ID');
    return id;
  }
}
