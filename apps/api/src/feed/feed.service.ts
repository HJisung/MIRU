import { Inject, Injectable } from '@nestjs/common';
import { MediaStatus, PostStatus, PostVisibility } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { decodeFeedCursor, encodeFeedCursor } from './feed.cursor.js';
import type { DiscoveryFeedDto } from './feed.dto.js';
import { toFeedItem } from './feed.mapper.js';
import type { FeedQuery } from './feed.query.js';

@Injectable()
export class FeedService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async discover(query: FeedQuery): Promise<DiscoveryFeedDto> {
    return this.findPage(query);
  }

  async following(userId: string, query: FeedQuery): Promise<DiscoveryFeedDto> {
    return this.findPage(query, userId);
  }

  private async findPage(
    query: FeedQuery,
    followerId?: string,
  ): Promise<DiscoveryFeedDto> {
    const cursor = query.cursor ? decodeFeedCursor(query.cursor) : null;
    const posts = await this.database.client.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        visibility: PostVisibility.PUBLIC,
        publishedAt: { not: null },
        ...(followerId
          ? {
              author: {
                followers: { some: { followerId } },
                blocksReceived: { none: { blockerId: followerId } },
                blocksMade: { none: { blockedId: followerId } },
              },
            }
          : {}),
        ...(cursor
          ? {
              OR: [
                { publishedAt: { lt: cursor.publishedAt } },
                { publishedAt: cursor.publishedAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      include: {
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
          orderBy: { order: 'asc' },
          include: { asset: true },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const hasMore = posts.length > query.limit;
    const page = hasMore ? posts.slice(0, query.limit) : posts;
    const last = page.at(-1);

    return {
      items: page.map(toFeedItem),
      nextCursor:
        hasMore && last?.publishedAt
          ? encodeFeedCursor({ id: last.id, publishedAt: last.publishedAt })
          : null,
    };
  }
}
