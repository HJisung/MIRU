import 'reflect-metadata';
import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { MediaKind, MediaPurpose, MediaStatus } from '@stream/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';

describe('EPISODIC Series content management', () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;
  let creator = { id: '', cookie: '' };
  let other = { id: '', cookie: '' };
  let admin = { id: '', cookie: '' };
  let seriesId = '';

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
    creator = await register('episode_creator');
    other = await register('episode_other');
    admin = await register('episode_admin');
    await database.client.user.update({
      where: { id: admin.id },
      data: { role: 'ADMIN' },
    });
    seriesId = await createAndApprove('EPISODIC');
  });

  afterAll(async () => {
    const ids = [creator.id, other.id, admin.id].filter(Boolean);
    await database.client.series.deleteMany({
      where: { creatorId: { in: ids } },
    });
    await database.client.post.deleteMany({ where: { authorId: { in: ids } } });
    await database.client.mediaAsset.deleteMany({
      where: { ownerId: { in: ids } },
    });
    await database.client.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('enforces approval, ownership, and EPISODIC-only management', async () => {
    expect(
      (
        await call('POST', `/series/${seriesId}/seasons`, other.cookie, {
          seasonNumber: 1,
        })
      ).statusCode,
    ).toBe(403);
    const unapproved = await createSeries(
      'EPISODIC',
      creator.cookie,
      'Unapproved',
    );
    expect(
      (
        await call('POST', `/series/${unapproved}/seasons`, creator.cookie, {
          seasonNumber: 1,
        })
      ).statusCode,
    ).toBe(403);
    const single = await createAndApprove('SINGLE_WORK');
    expect(
      (
        await call('POST', `/series/${single}/seasons`, creator.cookie, {
          seasonNumber: 1,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call('PUT', `/series/${single}/episodes/order`, creator.cookie, {
          episodeIds: [],
        })
      ).statusCode,
    ).toBe(400);
  });

  it('manages Seasons, multiple Episodes, metadata, and atomic ordering', async () => {
    const firstSeason = await call(
      'POST',
      `/series/${seriesId}/seasons`,
      creator.cookie,
      {
        seasonNumber: 1,
        title: '시작',
        description: '첫 번째 시즌',
      },
    );
    expect(firstSeason.statusCode).toBe(201);
    const seasonId = firstSeason.json<{ seasons: Array<{ id: string }> }>()
      .seasons[0].id;
    expect(
      (
        await call('POST', `/series/${seriesId}/seasons`, creator.cookie, {
          seasonNumber: 1,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call(
          'PATCH',
          `/series/${seriesId}/seasons/${seasonId}`,
          creator.cookie,
          { title: '새로운 시작', description: '수정된 설명' },
        )
      ).statusCode,
    ).toBe(200);
    const emptySeason = await call(
      'POST',
      `/series/${seriesId}/seasons`,
      creator.cookie,
      { seasonNumber: 2 },
    );
    const emptySeasonId = emptySeason
      .json<{
        seasons: Array<{ id: string; seasonNumber: number }>;
      }>()
      .seasons.find((season) => season.seasonNumber === 2)!.id;
    expect(
      (
        await call(
          'DELETE',
          `/series/${seriesId}/seasons/${emptySeasonId}`,
          creator.cookie,
        )
      ).statusCode,
    ).toBe(200);

    const firstAsset = await readyAsset(creator.id);
    const secondAsset = await readyAsset(creator.id);
    const first = await createEpisode(firstAsset.id, 1, '첫 화', seasonId, 1);
    expect(first.statusCode).toBe(201);
    const firstId = first.json<{ id: string }>().id;
    const retry = await createEpisode(
      firstAsset.id,
      1,
      '중복 요청',
      seasonId,
      1,
    );
    expect(retry.json<{ id: string }>().id).toBe(firstId);
    const second = await createEpisode(secondAsset.id, 2, '둘째 화');
    const secondId = second.json<{ id: string }>().id;
    expect(
      (await createEpisode((await readyAsset(creator.id)).id, 2, '번호 중복'))
        .statusCode,
    ).toBe(400);

    const foreignSeries = await createAndApprove('EPISODIC');
    const foreignSeason = await call(
      'POST',
      `/series/${foreignSeries}/seasons`,
      creator.cookie,
      { seasonNumber: 1 },
    );
    const foreignSeasonId = foreignSeason.json<{
      seasons: Array<{ id: string }>;
    }>().seasons[0].id;
    const concurrentAsset = await readyAsset(creator.id);
    const concurrentPayload = {
      assetId: concurrentAsset.id,
      episodeNumber: 1,
      title: '동시 재시도',
      synopsis: '동일 asset 요청',
    };
    const concurrent = await Promise.all([
      call(
        'POST',
        `/series/${foreignSeries}/episodes`,
        creator.cookie,
        concurrentPayload,
      ),
      call(
        'POST',
        `/series/${foreignSeries}/episodes`,
        creator.cookie,
        concurrentPayload,
      ),
    ]);
    expect(concurrent.map((response) => response.statusCode)).toEqual([
      201, 201,
    ]);
    expect(concurrent[0].json<{ id: string }>().id).toBe(
      concurrent[1].json<{ id: string }>().id,
    );
    expect(
      (
        await call(
          'PATCH',
          `/series/${seriesId}/episodes/${secondId}`,
          creator.cookie,
          { seasonId: foreignSeasonId, seasonEpisodeNumber: 2 },
        )
      ).statusCode,
    ).toBe(400);
    expect(
      (await call('GET', `/series/${seriesId}/manage`, creator.cookie))
        .json<{ episodes: Array<{ id: string; episodeNumber: number }> }>()
        .episodes.map(({ id, episodeNumber }) => ({ id, episodeNumber })),
    ).toEqual([
      { id: firstId, episodeNumber: 1 },
      { id: secondId, episodeNumber: 2 },
    ]);
    expect(
      (
        await call(
          'PUT',
          `/series/${seriesId}/episodes/order`,
          creator.cookie,
          { episodeIds: [firstId, crypto.randomUUID()] },
        )
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call(
          'PATCH',
          `/series/${seriesId}/episodes/${secondId}`,
          other.cookie,
          { title: '권한 없는 수정' },
        )
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await call('PUT', `/series/${seriesId}/episodes/order`, other.cookie, {
          episodeIds: [secondId, firstId],
        })
      ).statusCode,
    ).toBe(403);

    const edited = await call(
      'PATCH',
      `/series/${seriesId}/episodes/${secondId}`,
      creator.cookie,
      {
        title: '수정한 둘째 화',
        synopsis: '수정된 줄거리',
        seasonId,
        seasonEpisodeNumber: 2,
      },
    );
    expect(edited.statusCode).toBe(200);
    const editedEpisode = await database.client.seriesEpisode.findUniqueOrThrow(
      {
        where: { id: secondId },
      },
    );
    expect(editedEpisode.publicationId).toBeNull();
    expect(
      (
        await call(
          'PATCH',
          `/series/${seriesId}/episodes/${secondId}`,
          creator.cookie,
          { seasonEpisodeNumber: 1 },
        )
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call(
          'DELETE',
          `/series/${seriesId}/seasons/${seasonId}`,
          creator.cookie,
        )
      ).statusCode,
    ).toBe(400);

    const reordered = await call(
      'PUT',
      `/series/${seriesId}/episodes/order`,
      creator.cookie,
      { episodeIds: [secondId, firstId] },
    );
    expect(reordered.statusCode).toBe(200);
    expect(
      reordered
        .json<{ episodes: Array<{ id: string; episodeNumber: number }> }>()
        .episodes.map(({ id, episodeNumber }) => ({ id, episodeNumber })),
    ).toEqual([
      { id: secondId, episodeNumber: 1 },
      { id: firstId, episodeNumber: 2 },
    ]);
    expect(
      (
        await call(
          'PUT',
          `/series/${seriesId}/episodes/order`,
          creator.cookie,
          { episodeIds: [firstId, firstId] },
        )
      ).statusCode,
    ).toBe(400);
    expect(
      (await call('GET', `/series/${seriesId}/manage`, creator.cookie))
        .json<{ episodes: Array<{ id: string; episodeNumber: number }> }>()
        .episodes.map(({ id, episodeNumber }) => ({ id, episodeNumber })),
    ).toEqual([
      { id: secondId, episodeNumber: 1 },
      { id: firstId, episodeNumber: 2 },
    ]);

    const unassigned = await call(
      'PATCH',
      `/series/${seriesId}/episodes/${firstId}`,
      creator.cookie,
      { seasonId: null },
    );
    expect(
      unassigned
        .json<{
          episodes: Array<{
            id: string;
            seasonId: string | null;
            seasonEpisodeNumber: number | null;
          }>;
        }>()
        .episodes.find((episode) => episode.id === firstId),
    ).toMatchObject({ seasonId: null, seasonEpisodeNumber: null });
  });

  it('publishes, organizes, unpublishes, and republishes Episodes safely', async () => {
    const managed = await call(
      'GET',
      `/series/${seriesId}/manage`,
      creator.cookie,
    );
    const episodes = managed.json<{ episodes: Array<{ id: string }> }>()
      .episodes;
    expect(
      (
        await call(
          'POST',
          `/series/episodes/${episodes[0].id}/publish`,
          creator.cookie,
        )
      ).statusCode,
    ).toBe(400);
    expect(
      (await call('POST', `/series/${seriesId}/publish`, creator.cookie))
        .statusCode,
    ).toBe(200);
    for (const episode of episodes) {
      expect(
        (
          await call(
            'POST',
            `/series/episodes/${episode.id}/publish`,
            creator.cookie,
          )
        ).statusCode,
      ).toBe(200);
      expect(
        (
          await call(
            'POST',
            `/series/episodes/${episode.id}/publish`,
            creator.cookie,
          )
        ).statusCode,
      ).toBe(200);
    }
    const publicSeries = await call('GET', `/series/${seriesId}`);
    const publicEpisodes = publicSeries.json<{
      episodes: Array<{
        id: string;
        seasonNumber: number | null;
        seasonTitle: string | null;
        seasonEpisodeNumber: number | null;
      }>;
    }>().episodes;
    expect(publicEpisodes).toHaveLength(2);
    expect(publicEpisodes.some((episode) => episode.seasonNumber === 1)).toBe(
      true,
    );
    const seasoned = publicEpisodes.find(
      (episode) => episode.seasonNumber === 1,
    );
    expect(seasoned).toMatchObject({
      seasonTitle: '새로운 시작',
      seasonEpisodeNumber: 2,
    });
    const publicEpisode = await call('GET', `/series/episodes/${seasoned!.id}`);
    expect(
      publicEpisode.json<{ seasonNumber: number; seasonTitle: string }>(),
    ).toMatchObject({ seasonNumber: 1, seasonTitle: '새로운 시작' });
    expect(
      (
        await call(
          'POST',
          `/series/episodes/${episodes[0].id}/unpublish`,
          other.cookie,
        )
      ).statusCode,
    ).toBe(403);

    const concurrentUnpublish = await Promise.all(
      episodes.map((episode) =>
        call(
          'POST',
          `/series/episodes/${episode.id}/unpublish`,
          creator.cookie,
        ),
      ),
    );
    expect(
      concurrentUnpublish.map((response) => response.statusCode).sort(),
    ).toEqual([200, 400]);
    const afterConcurrentUnpublish =
      await database.client.seriesEpisode.findMany({
        where: { seriesId },
      });
    expect(
      afterConcurrentUnpublish.filter((episode) => episode.publishedAt),
    ).toHaveLength(1);
    for (const episode of afterConcurrentUnpublish)
      expect(episode.publicationId).toBeNull();
    for (const episode of episodes) {
      expect(
        (
          await call(
            'POST',
            `/series/episodes/${episode.id}/publish`,
            creator.cookie,
          )
        ).statusCode,
      ).toBe(200);
    }

    expect(
      (
        await call(
          'POST',
          `/series/episodes/${episodes[0].id}/unpublish`,
          creator.cookie,
        )
      ).statusCode,
    ).toBe(200);
    expect(
      await database.client.mediaPlaybackClaim.count({
        where: {
          asset: { seriesEpisodes: { some: { id: episodes[0].id } } },
        },
      }),
    ).toBe(1);
    expect(
      (await call('GET', `/series/episodes/${episodes[0].id}`)).statusCode,
    ).toBe(404);
    expect(
      (await call('GET', `/series/${seriesId}`)).json<{ episodes: unknown[] }>()
        .episodes,
    ).toHaveLength(1);
    expect(
      (
        await call(
          'POST',
          `/series/episodes/${episodes[1].id}/unpublish`,
          creator.cookie,
        )
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call(
          'POST',
          `/series/episodes/${episodes[0].id}/publish`,
          creator.cookie,
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await call(
          'POST',
          `/series/episodes/${episodes[0].id}/unpublish`,
          creator.cookie,
        )
      ).statusCode,
    ).toBe(200);
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

  async function createSeries(
    workType: 'EPISODIC' | 'SINGLE_WORK',
    cookie: string,
    title = `${workType} managed`,
  ) {
    const response = await call('POST', '/series', cookie, {
      title,
      synopsis: '콘텐츠 관리 통합 테스트',
      workType,
    });
    return response.json<{ id: string }>().id;
  }

  async function createAndApprove(workType: 'EPISODIC' | 'SINGLE_WORK') {
    const id = await createSeries(
      workType,
      creator.cookie,
      `${workType}-${crypto.randomUUID()}`,
    );
    const submitted = await call(
      'POST',
      `/series/${id}/submissions`,
      creator.cookie,
    );
    await call(
      'POST',
      `/admin/series-submissions/${submitted.json<{ id: string }>().id}/approve`,
      admin.cookie,
      { reason: '콘텐츠 관리 권한을 승인합니다.' },
    );
    return id;
  }

  function call(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    cookie?: string,
    payload?: Record<string, unknown>,
  ) {
    return app.inject({
      method,
      url: `/api/v1${path}`,
      headers: cookie ? { cookie } : undefined,
      payload,
    });
  }

  function createEpisode(
    assetId: string,
    episodeNumber: number,
    title: string,
    seasonId?: string,
    seasonEpisodeNumber?: number,
  ) {
    return call('POST', `/series/${seriesId}/episodes`, creator.cookie, {
      assetId,
      episodeNumber,
      title,
      synopsis: `${title} 줄거리`,
      seasonId,
      seasonEpisodeNumber,
    });
  }

  function readyAsset(ownerId: string) {
    const id = crypto.randomUUID();
    return database.client.mediaAsset.create({
      data: {
        id,
        ownerId,
        kind: MediaKind.VIDEO,
        purpose: MediaPurpose.LONG_VIDEO,
        status: MediaStatus.READY,
        sourceKey: `episode-management/${id}`,
        publicUrl: `/api/v1/media/assets/${id}/hls/master.m3u8`,
        mimeType: 'application/vnd.apple.mpegurl',
        hlsManifestKey: `derived/${id}/v2/master.m3u8`,
        posterKey: `derived/${id}/v2/poster.jpg`,
        pipelineVersion: 2,
      },
    });
  }
});
