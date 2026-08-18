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
  PostFormat,
  PostStatus,
  PostVisibility,
  SeriesWorkType,
} from '@stream/database';
import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { EngagementTargetService } from '../src/engagement/engagement-target.service.js';
import { StorageService } from '../src/storage/storage.service.js';

describe('native engagement and operational moderation', () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;
  let creator = { id: '', cookie: '' };
  let viewer = { id: '', cookie: '' };
  let moderator = { id: '', cookie: '' };
  let admin = { id: '', cookie: '' };
  const targets: Array<{ type: string; id: string }> = [];
  let homeId = '';
  let homeAssetId = '';

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
    vi.spyOn(app.get(StorageService), 'get').mockResolvedValue({
      Body: Readable.from(['#EXTM3U\n']),
      ContentLength: 8,
      $metadata: {},
    } as Awaited<ReturnType<StorageService['get']>>);
    [creator, viewer, moderator, admin] = await Promise.all([
      register('native_creator'),
      register('native_viewer'),
      register('native_mod'),
      register('native_admin'),
    ]);
    await database.client.user.update({
      where: { id: moderator.id },
      data: { role: 'MODERATOR' },
    });
    await database.client.user.update({
      where: { id: admin.id },
      data: { role: 'ADMIN' },
    });
    await createFixtures();
  });

  afterAll(async () => {
    const ids = [creator.id, viewer.id, moderator.id, admin.id].filter(Boolean);
    await database.client.moderationAuditLog.deleteMany({
      where: { actorId: { in: ids } },
    });
    await database.client.engagementReport.deleteMany({
      where: { reporterId: { in: ids } },
    });
    await database.client.engagementComment.deleteMany({
      where: { authorId: { in: ids } },
    });
    await database.client.engagementLike.deleteMany({
      where: { userId: { in: ids } },
    });
    await database.client.engagementSave.deleteMany({
      where: { userId: { in: ids } },
    });
    await database.client.shortForm.deleteMany({
      where: { creatorId: creator.id },
    });
    await database.client.communityPost.deleteMany({
      where: { authorId: creator.id },
    });
    await database.client.series.deleteMany({
      where: { creatorId: creator.id },
    });
    await database.client.homeVideo.deleteMany({
      where: { creatorId: creator.id },
    });
    await database.client.post.deleteMany({ where: { authorId: creator.id } });
    await database.client.mediaAsset.deleteMany({
      where: { ownerId: creator.id },
    });
    await database.client.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('persists product interactions natively and supports EPISODIC Series aggregate engagement', async () => {
    for (const target of targets) {
      const response = await engage('PUT', target, 'like');
      expect(response.statusCode).toBe(200);
      const native = await database.client.engagementTarget.findFirstOrThrow({
        where: productWhere(target),
      });
      expect(
        await database.client.engagementLike.count({
          where: { userId: viewer.id, targetId: native.id },
        }),
      ).toBe(1);
    }
    const episodic = targets.find((target) => target.type === 'SERIES')!;
    const series = await database.client.series.findUniqueOrThrow({
      where: { id: episodic.id },
    });
    expect(series.singleWorkPublicationId).toBeNull();
    expect(
      (
        await engage('POST', episodic, 'comments', {
          body: 'native series comment',
        })
      ).statusCode,
    ).toBe(201);
    expect((await engage('PUT', episodic, 'save')).statusCode).toBe(200);
    expect((await engage('PUT', episodic, 'save')).statusCode).toBe(200);
    expect((await engage('DELETE', episodic, 'save')).statusCode).toBe(204);
    expect((await engage('DELETE', episodic, 'save')).statusCode).toBe(204);
    const reports = await Promise.all([
      engage('POST', episodic, 'reports', {
        reason: 'SPAM',
        details: 'native report',
      }),
      engage('POST', episodic, 'reports', {
        reason: 'SPAM',
        details: 'native report retry',
      }),
    ]);
    expect(reports.map((response) => response.statusCode)).toEqual([201, 201]);
    const native = await database.client.engagementTarget.findFirstOrThrow({
      where: { seriesId: episodic.id },
    });
    expect(native.commentCount).toBe(1);
    expect(
      await database.client.engagementComment.count({
        where: { targetId: native.id },
      }),
    ).toBe(1);
    expect(
      await database.client.engagementReport.count({
        where: { targetId: native.id },
      }),
    ).toBe(1);
    expect(
      await database.client.engagementSave.count({
        where: { targetId: native.id, userId: viewer.id },
      }),
    ).toBe(0);
    expect(
      await database.client.report.count({ where: { reporterId: viewer.id } }),
    ).toBe(0);
  });

  it('serializes duplicate likes and keeps the native counter exact', async () => {
    const target = targets.find((item) => item.type === 'COMMUNITY_POST')!;
    await Promise.all([
      engage('DELETE', target, 'like'),
      engage('DELETE', target, 'like'),
    ]);
    const [first, second] = await Promise.all([
      engage('PUT', target, 'like'),
      engage('PUT', target, 'like'),
    ]);
    expect([first.statusCode, second.statusCode]).toEqual([200, 200]);
    const native = await database.client.engagementTarget.findFirstOrThrow({
      where: { communityPostId: target.id },
    });
    expect(native.likeCount).toBe(1);
    expect(
      await database.client.engagementLike.count({
        where: { targetId: native.id, userId: viewer.id },
      }),
    ).toBe(1);
  });

  it('rechecks target restriction inside an in-flight engagement mutation', async () => {
    const created = await request(
      'POST',
      '/community-posts/text',
      creator.cookie,
      { creationId: crypto.randomUUID(), body: 'engagement removal race' },
    );
    const target = {
      type: 'COMMUNITY_POST',
      id: created.json<{ id: string }>().id,
    };
    const report = await engage('POST', target, 'reports', {
      reason: 'OTHER',
      details: 'remove before delayed like writes',
    });
    const reportId = report.json<{ id: string }>().id;
    const targetService = app.get(EngagementTargetService);
    const original = targetService.lockActiveTarget.bind(targetService);
    let enter!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => (enter = resolve));
    const released = new Promise<void>((resolve) => (release = resolve));
    const spy = vi
      .spyOn(targetService, 'lockActiveTarget')
      .mockImplementationOnce(async (...args) => {
        enter();
        await released;
        return original(...args);
      });
    try {
      const like = engage('PUT', target, 'like');
      await entered;
      expect(
        (
          await request(
            'POST',
            `/moderation/reports/${reportId}/remove-content`,
            moderator.cookie,
            { note: 'remove while like is paused' },
          )
        ).statusCode,
      ).toBe(201);
      release();
      expect((await like).statusCode).toBe(403);
    } finally {
      release();
      spy.mockRestore();
    }
    const native = await database.client.engagementTarget.findFirstOrThrow({
      where: { communityPostId: target.id },
    });
    expect(
      await database.client.engagementLike.count({
        where: { targetId: native.id, userId: viewer.id },
      }),
    ).toBe(0);
  });

  it('enforces moderation roles, transitions, atomic removal, HLS denial, audit, and republish restriction', async () => {
    const mappedPublication = await database.client.homeVideo.findUniqueOrThrow(
      {
        where: { id: homeId },
        select: { publicationId: true },
      },
    );
    const residualPost = await database.client.post.create({
      data: {
        authorId: creator.id,
        format: PostFormat.IMAGE,
        status: PostStatus.DRAFT,
        visibility: PostVisibility.PUBLIC,
      },
    });
    await database.client.report.createMany({
      data: [
        {
          reporterId: viewer.id,
          postId: mappedPublication.publicationId,
          reason: 'OTHER',
        },
        { reporterId: viewer.id, postId: residualPost.id, reason: 'OTHER' },
      ],
    });
    const legacyQueue = await request(
      'GET',
      '/moderation/queue',
      moderator.cookie,
    );
    const legacyIds = legacyQueue
      .json<Array<{ post: { id: string } }>>()
      .map((item) => item.post.id);
    expect(legacyIds).toContain(residualPost.id);
    expect(legacyIds).not.toContain(mappedPublication.publicationId);
    const report = await engage(
      'POST',
      { type: 'HOME_VIDEO', id: homeId },
      'reports',
      { reason: 'VIOLENCE', details: 'review this video' },
    );
    const reportId = report.json<{ id: string }>().id;
    expect(
      (await request('GET', '/moderation/reports', viewer.cookie)).statusCode,
    ).toBe(403);
    expect(
      (await request('GET', '/moderation/reports', moderator.cookie))
        .statusCode,
    ).toBe(200);
    expect(
      (await request('GET', `/media/assets/${homeAssetId}/hls/master.m3u8`))
        .statusCode,
    ).toBe(200);
    expect(
      (
        await request(
          'POST',
          `/moderation/reports/${reportId}/review`,
          moderator.cookie,
          { note: 'taking review' },
        )
      ).statusCode,
    ).toBe(201);
    const removed = await request(
      'POST',
      `/moderation/reports/${reportId}/remove-content`,
      admin.cookie,
      { note: 'policy removal' },
    );
    expect(removed.statusCode).toBe(201);
    expect((await request('GET', `/home/videos/${homeId}`)).statusCode).toBe(
      404,
    );
    for (const file of [
      'master.m3u8',
      '720p/index.m3u8',
      '720p/segment-00000.ts',
      'poster.jpg',
    ]) {
      expect(
        (await request('GET', `/media/assets/${homeAssetId}/hls/${file}`))
          .statusCode,
      ).toBe(404);
    }
    expect(
      (await request('POST', `/home/videos/${homeId}/publish`, creator.cookie))
        .statusCode,
    ).toBe(403);
    const [target, claim, audit] = await Promise.all([
      database.client.engagementTarget.findFirstOrThrow({
        where: { homeVideoId: homeId },
      }),
      database.client.mediaPlaybackClaim.findUnique({
        where: { assetId: homeAssetId },
      }),
      database.client.moderationAuditLog.findMany({
        where: { reportId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    expect(target.moderationStatus).toBe('REMOVED');
    expect(claim).not.toBeNull();
    expect(audit.map((entry) => entry.action)).toEqual([
      'REVIEW_STARTED',
      'CONTENT_REMOVED',
    ]);
  });

  it('removes Episode, Series, Shortform, and Community products authoritatively', async () => {
    const order = ['SERIES_EPISODE', 'SERIES', 'SHORTFORM', 'COMMUNITY_POST'];
    for (const type of order) {
      const target = targets.find((item) => item.type === type)!;
      let report = await engage('POST', target, 'reports', {
        reason: 'OTHER',
        details: `remove ${type}`,
      });
      if (report.statusCode === 404)
        throw new Error(
          `${type} unexpectedly became non-public before removal`,
        );
      const reportId = report.json<{ id: string }>().id;
      report = await request(
        'POST',
        `/moderation/reports/${reportId}/remove-content`,
        moderator.cookie,
        { note: `remove ${type}` },
      );
      expect(report.statusCode).toBe(201);
      const native = await database.client.engagementTarget.findFirstOrThrow({
        where: productWhere(target),
      });
      expect(native.moderationStatus).toBe('REMOVED');
    }
    const episode = targets.find((item) => item.type === 'SERIES_EPISODE')!;
    const series = targets.find((item) => item.type === 'SERIES')!;
    const shortform = targets.find((item) => item.type === 'SHORTFORM')!;
    const community = targets.find((item) => item.type === 'COMMUNITY_POST')!;
    expect(
      (await request('GET', `/series/episodes/${episode.id}`)).statusCode,
    ).toBe(404);
    expect((await request('GET', `/series/${series.id}`)).statusCode).toBe(404);
    expect(
      (await request('GET', `/shortforms/${shortform.id}`)).statusCode,
    ).toBe(404);
    expect(
      (await request('GET', `/community-posts/${community.id}`)).statusCode,
    ).toBe(404);
  });

  it('serializes removal of two published Episodes and never leaves an empty published Series', async () => {
    const series = await database.client.series.create({
      data: {
        creatorId: creator.id,
        title: 'Concurrent episode removal',
        workType: SeriesWorkType.EPISODIC,
        publicationStatus: DomainPublicationStatus.PUBLISHED,
        engagementTarget: { create: { type: EngagementTargetType.SERIES } },
      },
    });
    const episodeIds: string[] = [];
    for (const episodeNumber of [1, 2]) {
      const post = await database.client.post.create({
        data: {
          authorId: creator.id,
          format: PostFormat.LONG_VIDEO,
          status: PostStatus.PUBLISHED,
          visibility: PostVisibility.PUBLIC,
          publishedAt: new Date(),
          seriesEpisode: {
            create: {
              seriesId: series.id,
              episodeNumber,
              title: `Concurrent episode ${episodeNumber}`,
              publishedAt: new Date(),
              engagementTarget: {
                create: { type: EngagementTargetType.SERIES_EPISODE },
              },
            },
          },
        },
        select: { seriesEpisode: { select: { id: true } } },
      });
      episodeIds.push(post.seriesEpisode!.id);
    }
    const reportIds: string[] = [];
    for (const id of episodeIds) {
      const report = await engage(
        'POST',
        { type: 'SERIES_EPISODE', id },
        'reports',
        { reason: 'OTHER', details: 'concurrent removal' },
      );
      reportIds.push(report.json<{ id: string }>().id);
    }
    const responses = await Promise.all(
      reportIds.map((id) =>
        request(
          'POST',
          `/moderation/reports/${id}/remove-content`,
          moderator.cookie,
          { note: 'concurrent episode removal' },
        ),
      ),
    );
    expect(responses.map((response) => response.statusCode)).toEqual([
      201, 201,
    ]);
    const [current, publishedCount] = await Promise.all([
      database.client.series.findUniqueOrThrow({ where: { id: series.id } }),
      database.client.seriesEpisode.count({
        where: { seriesId: series.id, publishedAt: { not: null } },
      }),
    ]);
    expect(publishedCount).toBe(0);
    expect(current.publicationStatus).toBe(DomainPublicationStatus.REMOVED);
  });

  it('allows only one coherent terminal decision when moderators race', async () => {
    const created = await request(
      'POST',
      '/community-posts/text',
      creator.cookie,
      { creationId: crypto.randomUUID(), body: 'moderator race target' },
    );
    const target = {
      type: 'COMMUNITY_POST',
      id: created.json<{ id: string }>().id,
    };
    const report = await engage('POST', target, 'reports', {
      reason: 'OTHER',
      details: 'race',
    });
    const reportId = report.json<{ id: string }>().id;
    const [dismiss, remove] = await Promise.all([
      request(
        'POST',
        `/moderation/reports/${reportId}/dismiss`,
        moderator.cookie,
        { note: 'dismiss' },
      ),
      request(
        'POST',
        `/moderation/reports/${reportId}/remove-content`,
        admin.cookie,
        { note: 'remove' },
      ),
    ]);
    expect(
      [dismiss.statusCode, remove.statusCode].filter((status) => status < 300),
    ).toHaveLength(1);
    expect([dismiss.statusCode, remove.statusCode]).toContain(409);
    expect(
      await database.client.moderationAuditLog.count({ where: { reportId } }),
    ).toBe(1);
  });

  async function createFixtures() {
    homeAssetId = crypto.randomUUID();
    await database.client.mediaAsset.create({
      data: {
        id: homeAssetId,
        ownerId: creator.id,
        kind: MediaKind.VIDEO,
        purpose: MediaPurpose.LONG_VIDEO,
        status: MediaStatus.READY,
        sourceKey: `native/${homeAssetId}`,
        publicUrl: `/api/v1/media/assets/${homeAssetId}/hls/master.m3u8`,
        mimeType: 'video/mp4',
        width: 1280,
        height: 720,
        durationMs: 2000,
        hlsManifestKey: `derived/${homeAssetId}/v2/master.m3u8`,
        posterKey: `derived/${homeAssetId}/v2/poster.jpg`,
      },
    });
    const homeCreate = await request('POST', '/home/videos', creator.cookie, {
      assetId: homeAssetId,
      title: 'Moderated Home',
      description: 'native',
    });
    homeId = homeCreate.json<{ id: string }>().id;
    expect(
      (await request('POST', `/home/videos/${homeId}/publish`, creator.cookie))
        .statusCode,
    ).toBe(201);
    targets.push({ type: 'HOME_VIDEO', id: homeId });

    const series = await database.client.series.create({
      data: {
        creatorId: creator.id,
        title: 'Native episodic',
        synopsis: 'No compatibility aggregate',
        workType: SeriesWorkType.EPISODIC,
        publicationStatus: DomainPublicationStatus.PUBLISHED,
        engagementTarget: { create: { type: EngagementTargetType.SERIES } },
      },
    });
    targets.push({ type: 'SERIES', id: series.id });
    const episodePost = await database.client.post.create({
      data: {
        authorId: creator.id,
        format: PostFormat.LONG_VIDEO,
        status: PostStatus.PUBLISHED,
        visibility: PostVisibility.PUBLIC,
        title: 'Native episode',
        publishedAt: new Date(),
        seriesEpisode: {
          create: {
            seriesId: series.id,
            episodeNumber: 1,
            title: 'Native episode',
            publishedAt: new Date(),
            engagementTarget: {
              create: { type: EngagementTargetType.SERIES_EPISODE },
            },
          },
        },
      },
      select: { seriesEpisode: { select: { id: true } } },
    });
    targets.push({ type: 'SERIES_EPISODE', id: episodePost.seriesEpisode!.id });
    await database.client.post.create({
      data: {
        authorId: creator.id,
        format: PostFormat.LONG_VIDEO,
        status: PostStatus.PUBLISHED,
        visibility: PostVisibility.PUBLIC,
        title: 'Second native episode',
        publishedAt: new Date(),
        seriesEpisode: {
          create: {
            seriesId: series.id,
            episodeNumber: 2,
            title: 'Second native episode',
            publishedAt: new Date(),
            engagementTarget: {
              create: { type: EngagementTargetType.SERIES_EPISODE },
            },
          },
        },
      },
    });

    const shortPost = await database.client.post.create({
      data: {
        authorId: creator.id,
        format: PostFormat.SHORT_VIDEO,
        status: PostStatus.PUBLISHED,
        visibility: PostVisibility.PUBLIC,
        publishedAt: new Date(),
        shortForm: {
          create: {
            creatorId: creator.id,
            type: 'VIDEO',
            description: 'native short',
            status: DomainPublicationStatus.PUBLISHED,
            publishedAt: new Date(),
            engagementTarget: {
              create: { type: EngagementTargetType.SHORTFORM },
            },
          },
        },
      },
      select: { shortForm: { select: { id: true } } },
    });
    targets.push({ type: 'SHORTFORM', id: shortPost.shortForm!.id });

    const community = await request(
      'POST',
      '/community-posts/text',
      creator.cookie,
      { creationId: crypto.randomUUID(), body: 'native Community Post' },
    );
    targets.push({
      type: 'COMMUNITY_POST',
      id: community.json<{ id: string }>().id,
    });
  }

  async function register(prefix: string) {
    const suffix = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `${prefix}_${suffix}@example.test`,
        handle: `${prefix.slice(0, 7)}_${suffix.slice(-8)}`,
        displayName: prefix,
        password: 'correct-horse-battery-staple',
      },
    });
    const header = response.headers['set-cookie'];
    return {
      id: response.json<{ id: string }>().id,
      cookie: (Array.isArray(header) ? header[0] : header)?.split(';')[0] ?? '',
    };
  }

  function request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    cookie = '',
    payload?: object,
  ) {
    return app.inject({
      method,
      url: `/api/v1${path}`,
      headers: cookie ? { cookie } : undefined,
      payload,
    });
  }

  function engage(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    target: { type: string; id: string },
    action: string,
    payload?: object,
  ) {
    return request(
      method,
      `/engagement/${target.type}/${target.id}/${action}`,
      viewer.cookie,
      payload,
    );
  }

  function productWhere(target: { type: string; id: string }) {
    if (target.type === 'HOME_VIDEO') return { homeVideoId: target.id };
    if (target.type === 'SERIES') return { seriesId: target.id };
    if (target.type === 'SERIES_EPISODE') return { seriesEpisodeId: target.id };
    if (target.type === 'SHORTFORM') return { shortFormId: target.id };
    return { communityPostId: target.id };
  }
});
