import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('public discovery flow (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { logger: false },
    );
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
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

  it('returns a display-ready post detail from the feed', async () => {
    const feed = await app.inject({
      method: 'GET',
      url: '/api/v1/feed/discovery?limit=1',
    });
    const item = feed.json<{ items: Array<{ id: string }> }>().items[0];
    expect(item).toBeDefined();
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/posts/${item.id}`,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json<{ media: unknown[] }>().media.length).toBeGreaterThan(0);
  });

  it('distinguishes standalone long-form videos from ordered series episodes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/feed/discovery?format=LONG_VIDEO&limit=12',
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
    ).toBeNull();
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
});
