import { Inject, Injectable } from '@nestjs/common';
import {
  DomainPublicationStatus,
  MediaStatus,
  ModerationTargetStatus,
  SeriesWorkType,
} from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import {
  decodeFeedCursor,
  encodeFeedCursor,
  type FeedCursor,
} from './feed.cursor.js';
import {
  FeedItemType,
  type DiscoveryFeedDto,
  type FeedItemDto,
} from './feed.dto.js';
import {
  feedTypeRank,
  toEpisodeFeedItem,
  toHomeFeedItem,
  toSeriesFeedItem,
  toShortformFeedItem,
} from './feed.mapper.js';
import type { FeedQuery } from './feed.query.js';

const creator = {
  select: { id: true, handle: true, displayName: true, avatarUrl: true },
} as const;
const target = { select: { likeCount: true, commentCount: true } } as const;

@Injectable()
export class FeedService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}
  discover(query: FeedQuery): Promise<DiscoveryFeedDto> {
    return this.findPage(query);
  }
  following(userId: string, query: FeedQuery): Promise<DiscoveryFeedDto> {
    return this.findPage(query, userId);
  }

  private async findPage(
    query: FeedQuery,
    followerId?: string,
  ): Promise<DiscoveryFeedDto> {
    const cursor = query.cursor ? decodeFeedCursor(query.cursor) : null;
    const types = query.type ? [query.type] : Object.values(FeedItemType);
    const authorFilter = followerId
      ? {
          followers: { some: { followerId } },
          blocksReceived: { none: { blockerId: followerId } },
          blocksMade: { none: { blockedId: followerId } },
        }
      : undefined;
    const take = query.limit + 1;
    const [homes, series, episodes, shorts] = await Promise.all([
      types.includes(FeedItemType.HOME_VIDEO)
        ? this.database.client.homeVideo.findMany({
            where: {
              status: DomainPublicationStatus.PUBLISHED,
              ...this.cursorWhere(cursor, FeedItemType.HOME_VIDEO),
              videoAsset: { status: MediaStatus.READY },
              engagementTarget: {
                moderationStatus: ModerationTargetStatus.ACTIVE,
              },
              creator: authorFilter,
            },
            include: { creator, videoAsset: true, engagementTarget: target },
            orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
            take,
          })
        : [],
      types.includes(FeedItemType.SERIES)
        ? this.database.client.series.findMany({
            where: {
              publicationStatus: DomainPublicationStatus.PUBLISHED,
              workType: SeriesWorkType.SINGLE_WORK,
              ...this.cursorWhere(cursor, FeedItemType.SERIES),
              singleWorkAsset: { status: MediaStatus.READY },
              engagementTarget: {
                moderationStatus: ModerationTargetStatus.ACTIVE,
              },
              creator: authorFilter,
            },
            include: {
              creator,
              singleWorkAsset: true,
              engagementTarget: target,
            },
            orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
            take,
          })
        : [],
      types.includes(FeedItemType.SERIES_EPISODE)
        ? this.database.client.seriesEpisode.findMany({
            where: {
              ...this.cursorWhere(cursor, FeedItemType.SERIES_EPISODE),
              videoAsset: { status: MediaStatus.READY },
              engagementTarget: {
                moderationStatus: ModerationTargetStatus.ACTIVE,
              },
              series: {
                publicationStatus: DomainPublicationStatus.PUBLISHED,
                engagementTarget: {
                  moderationStatus: ModerationTargetStatus.ACTIVE,
                },
                creator: authorFilter,
              },
            },
            include: {
              videoAsset: true,
              engagementTarget: target,
              series: {
                select: {
                  id: true,
                  title: true,
                  creator,
                  _count: {
                    select: {
                      episodes: { where: { publishedAt: { not: null } } },
                    },
                  },
                },
              },
            },
            orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
            take,
          })
        : [],
      types.includes(FeedItemType.SHORTFORM)
        ? this.database.client.shortForm.findMany({
            where: {
              status: DomainPublicationStatus.PUBLISHED,
              ...this.cursorWhere(cursor, FeedItemType.SHORTFORM),
              media: { some: { asset: { status: MediaStatus.READY } } },
              engagementTarget: {
                moderationStatus: ModerationTargetStatus.ACTIVE,
              },
              creator: authorFilter,
            },
            include: {
              creator,
              engagementTarget: target,
              media: {
                where: { asset: { status: MediaStatus.READY } },
                orderBy: { position: 'asc' },
                include: { asset: true },
              },
            },
            orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
            take,
          })
        : [],
    ]);
    const candidates: FeedItemDto[] = [
      ...homes.map(toHomeFeedItem),
      ...series.map(toSeriesFeedItem),
      ...episodes.map(toEpisodeFeedItem),
      ...shorts.map(toShortformFeedItem),
    ].sort(
      (a, b) =>
        b.publishedAt.localeCompare(a.publishedAt) ||
        feedTypeRank[b.type] - feedTypeRank[a.type] ||
        b.id.localeCompare(a.id),
    );
    const hasMore = candidates.length > query.limit;
    const page = candidates.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page,
      nextCursor:
        hasMore && last
          ? encodeFeedCursor({
              publishedAt: new Date(last.publishedAt),
              type: last.type,
              id: last.id,
            })
          : null,
    };
  }

  private cursorWhere(cursor: FeedCursor | null, type: FeedItemType) {
    if (!cursor) return { publishedAt: { not: null } };
    const rank = feedTypeRank[type],
      cursorRank = feedTypeRank[cursor.type];
    return rank < cursorRank
      ? { publishedAt: { lte: cursor.publishedAt } }
      : rank > cursorRank
        ? { publishedAt: { lt: cursor.publishedAt } }
        : {
            OR: [
              { publishedAt: { lt: cursor.publishedAt } },
              { publishedAt: cursor.publishedAt, id: { lt: cursor.id } },
            ],
          };
  }
}
