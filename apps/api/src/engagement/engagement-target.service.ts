import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DomainPublicationStatus,
  ModerationTargetStatus,
  PostStatus,
  PostVisibility,
} from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { EngagementTargetType } from './engagement.dto.js';
import type { Prisma } from '@stream/database';

/** Resolves and validates the narrow native identity for a public product. */
@Injectable()
export class EngagementTargetService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async resolve(type: EngagementTargetType, id: string): Promise<string> {
    const published = DomainPublicationStatus.PUBLISHED;
    let record: { engagementTarget: { id: string } | null } | null = null;
    switch (type) {
      case EngagementTargetType.HOME_VIDEO:
        record = await this.database.client.homeVideo.findFirst({
          where: { id, status: published, publishedAt: { not: null } },
          select: { engagementTarget: { select: { id: true } } },
        });
        break;
      case EngagementTargetType.SERIES:
        record = await this.database.client.series.findFirst({
          where: { id, publicationStatus: published },
          select: { engagementTarget: { select: { id: true } } },
        });
        break;
      case EngagementTargetType.SERIES_EPISODE:
        record = await this.database.client.seriesEpisode.findFirst({
          where: {
            id,
            publishedAt: { not: null },
            series: { publicationStatus: published },
          },
          select: { engagementTarget: { select: { id: true } } },
        });
        break;
      case EngagementTargetType.SHORTFORM:
        record = await this.database.client.shortForm.findFirst({
          where: { id, status: published, publishedAt: { not: null } },
          select: { engagementTarget: { select: { id: true } } },
        });
        break;
      case EngagementTargetType.COMMUNITY_POST:
        record = await this.database.client.communityPost.findFirst({
          where: { id, status: published, publishedAt: { not: null } },
          select: { engagementTarget: { select: { id: true } } },
        });
        break;
    }
    if (!record?.engagementTarget)
      throw new NotFoundException('Engagement target not found');
    const target = await this.database.client.engagementTarget.findFirst({
      where: {
        id: record.engagementTarget.id,
        moderationStatus: ModerationTargetStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Engagement target not found');
    return target.id;
  }

  async resolveLegacy(postId: string) {
    const mapped = await this.database.client.engagementTarget.findFirst({
      where: {
        OR: [
          { homeVideo: { publicationId: postId } },
          { series: { singleWorkPublicationId: postId } },
          { seriesEpisode: { publicationId: postId } },
          { shortForm: { publicationId: postId } },
          { communityPost: { publicationId: postId } },
        ],
      },
      select: { id: true, type: true },
    });
    if (mapped) {
      const productId = await this.productId(mapped.id, mapped.type);
      await this.resolve(mapped.type as EngagementTargetType, productId);
      return { nativeTargetId: mapped.id, legacyPostId: null };
    }
    const legacy = await this.database.client.post.findFirst({
      where: {
        id: postId,
        status: PostStatus.PUBLISHED,
        visibility: PostVisibility.PUBLIC,
      },
      select: { id: true },
    });
    if (!legacy) throw new NotFoundException('Engagement target not found');
    return { nativeTargetId: null, legacyPostId: legacy.id };
  }

  async lockActive(
    tx: Prisma.TransactionClient,
    type: EngagementTargetType,
    productId: string,
  ) {
    type LockedTarget = { id: string; moderationStatus: string };
    let rows: LockedTarget[];
    switch (type) {
      case EngagementTargetType.HOME_VIDEO:
        rows = await tx.$queryRaw<LockedTarget[]>`
          SELECT "id", "moderationStatus"::text FROM "EngagementTarget"
          WHERE "homeVideoId" = ${productId}::uuid FOR UPDATE`;
        break;
      case EngagementTargetType.SERIES:
        rows = await tx.$queryRaw<LockedTarget[]>`
          SELECT "id", "moderationStatus"::text FROM "EngagementTarget"
          WHERE "seriesId" = ${productId}::uuid FOR UPDATE`;
        break;
      case EngagementTargetType.SERIES_EPISODE:
        rows = await tx.$queryRaw<LockedTarget[]>`
          SELECT "id", "moderationStatus"::text FROM "EngagementTarget"
          WHERE "seriesEpisodeId" = ${productId}::uuid FOR UPDATE`;
        break;
      case EngagementTargetType.SHORTFORM:
        rows = await tx.$queryRaw<LockedTarget[]>`
          SELECT "id", "moderationStatus"::text FROM "EngagementTarget"
          WHERE "shortFormId" = ${productId}::uuid FOR UPDATE`;
        break;
      case EngagementTargetType.COMMUNITY_POST:
        rows = await tx.$queryRaw<LockedTarget[]>`
          SELECT "id", "moderationStatus"::text FROM "EngagementTarget"
          WHERE "communityPostId" = ${productId}::uuid FOR UPDATE`;
        break;
    }
    const target = rows[0];
    if (!target) throw new NotFoundException('Engagement target not found');
    if (target.moderationStatus !== ModerationTargetStatus.ACTIVE)
      throw new ForbiddenException('Content was removed by moderation');
    return target.id;
  }

  async lockActiveTarget(tx: Prisma.TransactionClient, targetId: string) {
    const rows = await tx.$queryRaw<{ moderationStatus: string }[]>`
      SELECT "moderationStatus"::text FROM "EngagementTarget"
      WHERE "id" = ${targetId}::uuid FOR UPDATE`;
    if (!rows[0]) throw new NotFoundException('Engagement target not found');
    if (rows[0].moderationStatus !== ModerationTargetStatus.ACTIVE)
      throw new ForbiddenException('Content was removed by moderation');
  }

  private async productId(id: string, type: string) {
    const target =
      await this.database.client.engagementTarget.findUniqueOrThrow({
        where: { id },
        select: {
          homeVideoId: true,
          seriesId: true,
          seriesEpisodeId: true,
          shortFormId: true,
          communityPostId: true,
        },
      });
    const values = {
      HOME_VIDEO: target.homeVideoId,
      SERIES: target.seriesId,
      SERIES_EPISODE: target.seriesEpisodeId,
      SHORTFORM: target.shortFormId,
      COMMUNITY_POST: target.communityPostId,
    } as const;
    const productId = values[type as keyof typeof values];
    if (!productId) throw new NotFoundException('Engagement target not found');
    return productId;
  }
}
