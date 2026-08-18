import 'reflect-metadata';
import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  DomainPublicationStatus,
  EngagementTargetType,
  MediaKind,
  MediaPurpose,
  MediaStatus,
  ModerationTargetStatus,
  ShortFormType,
} from '@stream/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';

describe('public discovery flow (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.register(fastifyCookie);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    database = app.get(DatabaseService);
  });

  afterAll(async () => app.close());

  it('pages through discovery posts without returning the same post twice', async () => {
    const firstResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/feed/discovery?limit=2',
    });
    expect(firstResponse.statusCode).toBe(200);
    const first = firstResponse.json<{
      items: Array<{ id: string }>;
      nextCursor: string;
    }>();
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).toBeTruthy();

    const secondResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/feed/discovery?limit=2&cursor=${encodeURIComponent(first.nextCursor)}`,
    });
    expect(secondResponse.statusCode).toBe(200);
    const second = secondResponse.json<{ items: Array<{ id: string }> }>();
    expect(second.items).toHaveLength(2);
    expect(second.items.map((item) => item.id)).not.toContain(
      first.items[0]?.id,
    );
    expect(second.items.map((item) => item.id)).not.toContain(
      first.items[1]?.id,
    );
  });

  it('paginates identical timestamps by native type and applies following, block, moderation, and native counters', async () => {
    const viewer = await register('feed_viewer');
    const followed = await register('feed_followed');
    const blocked = await register('feed_blocked');
    const moderated = await register('feed_moderated');
    const userIds = [viewer.id, followed.id, blocked.id, moderated.id];
    const assetIds: string[] = [];
    const sharedProductId = crypto.randomUUID();
    const publishedAt = new Date('2099-08-19T00:00:00.000Z');
    try {
      await database.client.follow.createMany({
        data: [
          { followerId: viewer.id, followeeId: followed.id },
          { followerId: viewer.id, followeeId: blocked.id },
          { followerId: viewer.id, followeeId: moderated.id },
        ],
      });
      await database.client.block.create({
        data: { blockerId: blocked.id, blockedId: viewer.id },
      });
      const homeAsset = await readyAsset(followed.id, MediaPurpose.LONG_VIDEO);
      const shortAsset = await readyAsset(
        followed.id,
        MediaPurpose.SHORT_VIDEO,
      );
      const blockedAsset = await readyAsset(
        blocked.id,
        MediaPurpose.LONG_VIDEO,
      );
      const moderatedAsset = await readyAsset(
        moderated.id,
        MediaPurpose.LONG_VIDEO,
      );
      assetIds.push(
        homeAsset.id,
        shortAsset.id,
        blockedAsset.id,
        moderatedAsset.id,
      );
      await database.client.homeVideo.create({
        data: {
          id: sharedProductId,
          creatorId: followed.id,
          videoAssetId: homeAsset.id,
          title: 'Same timestamp Home',
          status: DomainPublicationStatus.PUBLISHED,
          publishedAt,
          engagementTarget: {
            create: {
              type: EngagementTargetType.HOME_VIDEO,
              likeCount: 17,
              commentCount: 5,
            },
          },
        },
      });
      await database.client.shortForm.create({
        data: {
          id: sharedProductId,
          creatorId: followed.id,
          type: ShortFormType.VIDEO,
          title: 'Same timestamp Short',
          status: DomainPublicationStatus.PUBLISHED,
          publishedAt,
          media: { create: { assetId: shortAsset.id, position: 0 } },
          engagementTarget: {
            create: { type: EngagementTargetType.SHORTFORM },
          },
        },
      });
      await database.client.homeVideo.create({
        data: {
          creatorId: blocked.id,
          videoAssetId: blockedAsset.id,
          title: 'Blocked Home',
          status: DomainPublicationStatus.PUBLISHED,
          publishedAt: new Date('2098-08-20T00:00:00.000Z'),
          engagementTarget: {
            create: { type: EngagementTargetType.HOME_VIDEO },
          },
        },
      });
      await database.client.homeVideo.create({
        data: {
          creatorId: moderated.id,
          videoAssetId: moderatedAsset.id,
          title: 'Moderated Home',
          status: DomainPublicationStatus.PUBLISHED,
          publishedAt: new Date('2099-08-21T00:00:00.000Z'),
          engagementTarget: {
            create: {
              type: EngagementTargetType.HOME_VIDEO,
              moderationStatus: ModerationTargetStatus.REMOVED,
              removedAt: new Date(),
            },
          },
        },
      });

      const first = await app.inject({
        method: 'GET',
        url: '/api/v1/feed/discovery?limit=1',
      });
      expect(first.statusCode, first.body).toBe(200);
      const firstBody = first.json<{
        items: Array<{
          id: string;
          type: string;
          likeCount: number;
          commentCount: number;
        }>;
        nextCursor: string;
      }>();
      expect(firstBody.items[0]).toMatchObject({
        id: sharedProductId,
        type: 'HOME_VIDEO',
        likeCount: 17,
        commentCount: 5,
      });
      const second = await app.inject({
        method: 'GET',
        url: `/api/v1/feed/discovery?limit=1&cursor=${encodeURIComponent(firstBody.nextCursor)}`,
      });
      expect(
        second.json<{ items: Array<{ id: string; type: string }> }>().items[0],
      ).toMatchObject({ id: sharedProductId, type: 'SHORTFORM' });

      const following = await app.inject({
        method: 'GET',
        url: '/api/v1/feed/following?limit=10',
        headers: { cookie: viewer.cookie },
      });
      const followingItems = following.json<{
        items: Array<{ id: string; type: string; title: string }>;
      }>().items;
      expect(followingItems.map(({ id, type }) => `${type}:${id}`)).toEqual([
        `HOME_VIDEO:${sharedProductId}`,
        `SHORTFORM:${sharedProductId}`,
      ]);
      expect(
        followingItems.some(
          (item) =>
            item.title === 'Blocked Home' || item.title === 'Moderated Home',
        ),
      ).toBe(false);
    } finally {
      await database.client.shortForm.deleteMany({
        where: { creatorId: { in: userIds } },
      });
      await database.client.homeVideo.deleteMany({
        where: { creatorId: { in: userIds } },
      });
      await database.client.mediaAsset.deleteMany({
        where: { id: { in: assetIds } },
      });
      await database.client.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it('returns product identities and canonical product details from the feed', async () => {
    const feed = await app.inject({
      method: 'GET',
      url: '/api/v1/feed/discovery?limit=1',
    });
    const item = feed.json<{
      items: Array<{
        id: string;
        type: string;
        engagementTarget: { type: string; id: string };
        publicationId?: string;
      }>;
    }>().items[0];
    expect(item).toBeDefined();
    expect(item?.publicationId).toBeUndefined();
    expect(item?.engagementTarget).toEqual({ type: item?.type, id: item?.id });
    const path =
      item?.type === 'HOME_VIDEO'
        ? `/home/videos/${item.id}`
        : item?.type === 'SERIES'
          ? `/series/${item.id}`
          : item?.type === 'SERIES_EPISODE'
            ? `/series/episodes/${item.id}`
            : `/shortforms/${item?.id}`;
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1${path}`,
    });
    expect(detail.statusCode).toBe(200);
  });

  it('distinguishes standalone long-form videos from ordered series episodes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/feed/discovery?limit=12',
    });
    expect(response.statusCode).toBe(200);
    const items = response.json<{
      items: Array<{
        series: null | {
          title: string;
          episodeNumber: number;
          episodeCount: number;
        };
      }>;
    }>().items;
    expect(items.some((item) => item.series === null)).toBe(true);
    expect(items.some((item) => item.series?.episodeCount === 2)).toBe(true);
    expect(
      items.map((item) => item.series?.episodeNumber).filter(Boolean),
    ).toEqual(expect.arrayContaining([1, 2]));
  });

  it('serves Home Singles independently from reviewed Series works', async () => {
    const home = await app.inject({
      method: 'GET',
      url: '/api/v1/home/videos',
    });
    expect(home.statusCode).toBe(200);
    const homeItems = home.json<{
      items: Array<{
        id: string;
        playable: { kind: string; id: string };
        media: unknown;
      }>;
    }>().items;
    expect(homeItems.length).toBeGreaterThan(0);
    expect(homeItems.every((item) => item.playable.kind === 'HOME_VIDEO')).toBe(
      true,
    );

    const collections = await app.inject({
      method: 'GET',
      url: '/api/v1/home/collections',
    });
    expect(collections.statusCode).toBe(200);
    expect(
      collections.json<{ items: Array<{ items: unknown[] }> }>().items[0]?.items
        .length,
    ).toBeGreaterThan(0);

    const series = await app.inject({ method: 'GET', url: '/api/v1/series' });
    expect(series.statusCode).toBe(200);
    const works = series.json<{
      items: Array<{
        id: string;
        workType: string;
        singleWork: null | { id: string };
        episodes: Array<{ id: string; playable: unknown }>;
      }>;
    }>().items;
    const episodic = works.find(
      (work) => work.id === '40000000-0000-4000-8000-000000000001',
    );
    expect(episodic).toBeDefined();
    expect(
      (episodic as { engagementTarget?: unknown }).engagementTarget,
    ).toEqual({ type: 'SERIES', id: episodic?.id });
    expect(episodic?.episodes.length).toBeGreaterThan(0);
    const single = works.find(
      (work) => work.id === '40000000-0000-4000-8000-000000000002',
    );
    expect(single?.episodes).toHaveLength(0);
    expect(single?.singleWork?.id).toBe(single?.id);
    expect(
      (single as { engagementTarget?: unknown })?.engagementTarget,
    ).toEqual({ type: 'SERIES', id: single?.id });

    const episode = await app.inject({
      method: 'GET',
      url: `/api/v1/series/episodes/${episodic?.episodes[0]?.id}`,
    });
    expect(episode.statusCode).toBe(200);
    expect(episode.json<{ playable: unknown }>().playable).toBeTruthy();
  });

  it('serves published VIDEO and ordered IMAGE_CAROUSEL Shortforms with promotions', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/shortforms',
    });
    expect(response.statusCode).toBe(200);
    const items = response.json<{
      items: Array<{
        id: string;
        type: string;
        media: Array<{ url: string }>;
        promotedContent: null | { kind: string; id: string };
      }>;
    }>().items;
    expect(items.some((item) => item.type === 'VIDEO')).toBe(true);
    const carousel = items.find((item) => item.type === 'IMAGE_CAROUSEL');
    expect(carousel?.media.map((media) => media.url)).toEqual([
      '/demo/dawn-city.png',
      '/demo/summer-table.png',
    ]);
    expect(carousel?.promotedContent?.kind).toBe('SERIES');
    expect(
      items.some((item) => item.promotedContent?.kind === 'HOME_VIDEO'),
    ).toBe(true);
    expect(
      items.some((item) => item.promotedContent?.kind === 'SERIES_EPISODE'),
    ).toBe(true);
    expect(items.some((item) => item.media.length === 0)).toBe(false);
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/shortforms/${carousel?.id}`,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json<{ type: string }>().type).toBe('IMAGE_CAROUSEL');

    const comments = await app.inject({
      method: 'GET',
      url: `/api/v1/engagement/SHORTFORM/${carousel?.id}/comments`,
    });
    expect(comments.statusCode).toBe(200);
    const wrongType = await app.inject({
      method: 'GET',
      url: `/api/v1/engagement/HOME_VIDEO/${carousel?.id}/comments`,
    });
    expect(wrongType.statusCode).toBe(404);
  });

  it('keeps Post Home separate from managed Community Categories', async () => {
    const home = await app.inject({
      method: 'GET',
      url: '/api/v1/community-posts',
    });
    expect(home.statusCode).toBe(200);
    const homeItems = home.json<{
      items: Array<{ category: unknown; type: string; body: string }>;
    }>().items;
    expect(homeItems.length).toBeGreaterThan(0);
    expect(homeItems.every((item) => item.category === null)).toBe(true);

    const develop = await app.inject({
      method: 'GET',
      url: '/api/v1/community-posts?category=develop',
    });
    expect(develop.statusCode).toBe(200);
    const categoryItems = develop.json<{
      items: Array<{
        category: null | { slug: string };
        type: string;
        body: string;
      }>;
    }>().items;
    expect(categoryItems.length).toBeGreaterThan(0);
    expect(
      categoryItems.every((item) => item.category?.slug === 'develop'),
    ).toBe(true);
    expect(categoryItems.some((item) => item.type === 'LINK')).toBe(true);
    expect(
      [...homeItems, ...categoryItems].some(
        (item) => item.body === '공개 API에 노출되면 안 됩니다.',
      ),
    ).toBe(false);
    expect(
      [...homeItems, ...categoryItems].some(
        (item) => item.body === '삭제 처리된 Community Post',
      ),
    ).toBe(false);
  });

  it('lists active Community Categories from the domain source of truth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/community-categories',
    });
    expect(response.statusCode).toBe(200);
    expect(
      response
        .json<{ items: Array<{ slug: string }> }>()
        .items.map((item) => item.slug),
    ).toEqual([
      'develop',
      'ride',
      'soccer',
      'baseball',
      'internet-broadcasting',
    ]);
  });

  async function register(label: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `${label}-${crypto.randomUUID()}@example.test`,
        handle: `${label}_${crypto.randomUUID().slice(0, 8)}`,
        displayName: label,
        password: 'correct-horse-battery-staple',
      },
    });
    const header = response.headers['set-cookie'];
    return {
      id: response.json<{ id: string }>().id,
      cookie: (Array.isArray(header) ? header[0] : header)?.split(';')[0] ?? '',
    };
  }

  function readyAsset(ownerId: string, purpose: MediaPurpose) {
    const id = crypto.randomUUID();
    return database.client.mediaAsset.create({
      data: {
        id,
        ownerId,
        kind: MediaKind.VIDEO,
        purpose,
        status: MediaStatus.READY,
        sourceKey: `feed-verification/${id}`,
        publicUrl: `/api/v1/media/assets/${id}/hls/master.m3u8`,
        mimeType: 'application/vnd.apple.mpegurl',
        width: 1280,
        height: 720,
        durationMs: 1_000,
        hlsManifestKey: `derived/${id}/v2/master.m3u8`,
        posterKey: `derived/${id}/v2/poster.jpg`,
      },
    });
  }
});
