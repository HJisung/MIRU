import 'reflect-metadata';
import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  MediaKind,
  MediaPurpose,
  MediaStatus,
  PostStatus,
} from '@stream/database';
import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { StorageService } from '../src/storage/storage.service.js';

describe('Community Post authoring', () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;
  let authorId = '';
  let otherId = '';
  let authorCookie = '';
  let otherCookie = '';

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
    vi.spyOn(app.get(StorageService), 'get').mockImplementation(() =>
      Promise.resolve({
        Body: Readable.from(['#EXTM3U\n']),
        ContentLength: 8,
        $metadata: {},
      } as Awaited<ReturnType<StorageService['get']>>),
    );
    const [author, other] = await Promise.all([
      register('community_author'),
      register('community_other'),
    ]);
    authorId = author.id;
    authorCookie = author.cookie;
    otherId = other.id;
    otherCookie = other.cookie;
  });

  afterAll(async () => {
    for (const userId of [authorId, otherId]) {
      if (!userId) continue;
      await database.client.communityPost.deleteMany({
        where: { authorId: userId },
      });
      await database.client.homeVideo.deleteMany({
        where: { creatorId: userId },
      });
      await database.client.post.deleteMany({ where: { authorId: userId } });
      await database.client.mediaAsset.deleteMany({
        where: { ownerId: userId },
      });
      await database.client.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  async function register(prefix: string) {
    const suffix = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `${prefix}_${suffix}@example.test`,
        handle: `${prefix.slice(0, 8)}_${suffix.slice(-8)}`,
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

  async function readyAsset(
    ownerId: string,
    kind: MediaKind,
    purpose: MediaPurpose,
    status: MediaStatus = MediaStatus.READY,
  ) {
    const id = crypto.randomUUID();
    return database.client.mediaAsset.create({
      data: {
        id,
        ownerId,
        kind,
        purpose,
        status,
        sourceKey: `test/${id}`,
        publicUrl:
          kind === MediaKind.VIDEO
            ? `/api/v1/media/assets/${id}/hls/master.m3u8`
            : `/api/v1/media/assets/${id}/content`,
        mimeType: kind === MediaKind.VIDEO ? 'video/mp4' : 'image/png',
        width: 640,
        height: 360,
        durationMs: kind === MediaKind.VIDEO ? 2_000 : null,
        hlsManifestKey:
          kind === MediaKind.VIDEO ? `derived/${id}/v2/master.m3u8` : null,
        posterKey:
          kind === MediaKind.VIDEO ? `derived/${id}/v2/poster.jpg` : null,
      },
    });
  }

  it('publishes TEXT idempotently and keeps Post Home separate from Categories', async () => {
    const whitespace = await app.inject({
      method: 'POST',
      url: '/api/v1/community-posts/text',
      headers: { cookie: authorCookie },
      payload: { creationId: crypto.randomUUID(), body: ' \n ' },
    });
    expect(whitespace.statusCode).toBe(400);

    const creationId = crypto.randomUUID();
    const payload = { creationId, body: '같은 본문\n두 번째 줄' };
    const [first, retry] = await Promise.all(
      [payload, payload].map((body) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/community-posts/text',
          headers: { cookie: authorCookie },
          payload: body,
        }),
      ),
    );
    expect([first.statusCode, retry.statusCode]).toEqual([201, 201]);
    const id = first.json<{ id: string }>().id;
    expect(retry.json<{ id: string }>().id).toBe(id);
    const textStored = await database.client.communityPost.findUniqueOrThrow({
      where: { id },
    });
    expect(
      await app.inject({
        method: 'GET',
        url: `/api/v1/posts/${textStored.publicationId}`,
      }),
    ).toMatchObject({ statusCode: 404 });
    expect(
      await database.client.communityPost.count({
        where: { authorId, creationId },
      }),
    ).toBe(1);

    const intentionalDuplicate = await app.inject({
      method: 'POST',
      url: '/api/v1/community-posts/text',
      headers: { cookie: authorCookie },
      payload: { creationId: crypto.randomUUID(), body: payload.body },
    });
    expect(intentionalDuplicate.json<{ id: string }>().id).not.toBe(id);

    const category = await app.inject({
      method: 'POST',
      url: '/api/v1/community-posts/text',
      headers: { cookie: authorCookie },
      payload: {
        creationId: crypto.randomUUID(),
        body: '카테고리 글',
        categorySlug: 'develop',
      },
    });
    expect(category.statusCode).toBe(201);
    const home = await app.inject({
      method: 'GET',
      url: '/api/v1/community-posts',
    });
    expect(
      home.json<{ items: Array<{ id: string }> }>().items,
    ).not.toContainEqual(
      expect.objectContaining({ id: category.json<{ id: string }>().id }),
    );
  });

  it('publishes IMAGE and enforces ownership, readiness, and purpose', async () => {
    const image = await readyAsset(
      authorId,
      MediaKind.IMAGE,
      MediaPurpose.POST_IMAGE,
    );
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/community-posts/image',
      headers: { cookie: authorCookie },
      payload: {
        creationId: crypto.randomUUID(),
        assetId: image.id,
        caption: '이미지 캡션',
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json<{ type: string }>().type).toBe('IMAGE');
    expect(
      await app.inject({
        method: 'GET',
        url: `/api/v1/media/assets/${image.id}/content`,
      }),
    ).toMatchObject({ statusCode: 200 });
    const imagePostId = created.json<{ id: string }>().id;
    const imagePost = await database.client.communityPost.findUniqueOrThrow({
      where: { id: imagePostId },
    });
    expect(
      await app.inject({
        method: 'GET',
        url: `/api/v1/posts/${imagePost.publicationId}`,
      }),
    ).toMatchObject({ statusCode: 404 });
    expect(
      await app.inject({
        method: 'POST',
        url: `/api/v1/community-posts/${imagePostId}/archive`,
        headers: { cookie: authorCookie },
      }),
    ).toMatchObject({ statusCode: 200 });
    await database.client.post.update({
      where: { id: imagePost.publicationId },
      data: { status: PostStatus.PUBLISHED, publishedAt: new Date() },
    });
    expect(
      await app.inject({
        method: 'GET',
        url: `/api/v1/media/assets/${image.id}/content`,
      }),
    ).toMatchObject({ statusCode: 404 });
    await database.client.post.update({
      where: { id: imagePost.publicationId },
      data: { status: PostStatus.ARCHIVED, publishedAt: null },
    });

    for (const asset of [
      await readyAsset(otherId, MediaKind.IMAGE, MediaPurpose.POST_IMAGE),
      await readyAsset(
        authorId,
        MediaKind.IMAGE,
        MediaPurpose.POST_IMAGE,
        MediaStatus.PENDING_UPLOAD,
      ),
      await readyAsset(authorId, MediaKind.IMAGE, MediaPurpose.AVATAR),
    ]) {
      const rejected = await app.inject({
        method: 'POST',
        url: '/api/v1/community-posts/image',
        headers: { cookie: authorCookie },
        payload: {
          creationId: crypto.randomUUID(),
          assetId: asset.id,
          caption: '',
        },
      });
      expect(rejected.statusCode).toBe(404);
    }
  });

  it('validates LINK schemes and allows an empty commentary', async () => {
    for (const linkUrl of [
      'javascript:alert(1)',
      'data:text/plain,no',
      'file:///tmp/no',
      'not a url',
    ]) {
      const rejected = await app.inject({
        method: 'POST',
        url: '/api/v1/community-posts/link',
        headers: { cookie: authorCookie },
        payload: { creationId: crypto.randomUUID(), body: '', linkUrl },
      });
      expect(rejected.statusCode).toBe(400);
    }
    for (const linkUrl of ['https://example.com/path', 'http://example.com']) {
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/community-posts/link',
        headers: { cookie: authorCookie },
        payload: { creationId: crypto.randomUUID(), body: '', linkUrl },
      });
      expect(created.statusCode).toBe(201);
      expect(created.json<{ linkUrl: string }>().linkUrl).toBe(linkUrl);
    }
  });

  it('claims one VIDEO idempotently and gates HLS on publication', async () => {
    for (const asset of [
      await readyAsset(otherId, MediaKind.VIDEO, MediaPurpose.POST_VIDEO),
      await readyAsset(authorId, MediaKind.VIDEO, MediaPurpose.LONG_VIDEO),
      await readyAsset(
        authorId,
        MediaKind.VIDEO,
        MediaPurpose.POST_VIDEO,
        MediaStatus.PROCESSING,
      ),
    ]) {
      const rejected = await app.inject({
        method: 'POST',
        url: '/api/v1/community-posts/video',
        headers: { cookie: authorCookie },
        payload: {
          creationId: crypto.randomUUID(),
          assetId: asset.id,
          body: '',
        },
      });
      expect(rejected.statusCode).toBe(404);
    }
    const racingAsset = await readyAsset(
      authorId,
      MediaKind.VIDEO,
      MediaPurpose.POST_VIDEO,
    );
    const [communityRace, homeRace] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/community-posts/video',
        headers: { cookie: authorCookie },
        payload: {
          creationId: crypto.randomUUID(),
          assetId: racingAsset.id,
          body: '교차 제품 경쟁',
        },
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/home/videos',
        headers: { cookie: authorCookie },
        payload: {
          assetId: racingAsset.id,
          title: '교차 제품 경쟁',
          description: '',
        },
      }),
    ]);
    expect(
      [communityRace.statusCode, homeRace.statusCode].filter(
        (status) => status < 300,
      ),
    ).toHaveLength(1);
    expect(
      await database.client.mediaPlaybackClaim.count({
        where: { assetId: racingAsset.id },
      }),
    ).toBe(1);
    const video = await readyAsset(
      authorId,
      MediaKind.VIDEO,
      MediaPurpose.POST_VIDEO,
    );
    const before = await app.inject({
      method: 'GET',
      url: `/api/v1/media/assets/${video.id}/hls/master.m3u8`,
    });
    expect(before.statusCode).toBe(404);

    const creationId = crypto.randomUUID();
    const create = (identity: string) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/community-posts/video',
        headers: { cookie: authorCookie },
        payload: { creationId: identity, assetId: video.id, body: '동영상 글' },
      });
    const [first, retry] = await Promise.all([
      create(creationId),
      create(creationId),
    ]);
    expect([first.statusCode, retry.statusCode]).toEqual([201, 201]);
    const id = first.json<{ id: string }>().id;
    expect(retry.json<{ id: string }>().id).toBe(id);
    const sameIdentityRetry = await create(creationId);
    expect(sameIdentityRetry.json<{ id: string }>().id).toBe(id);
    const differentIdentity = await create(crypto.randomUUID());
    expect(differentIdentity.statusCode).toBeGreaterThanOrEqual(400);
    expect(
      await database.client.mediaPlaybackClaim.count({
        where: { assetId: video.id, kind: 'COMMUNITY_POST_VIDEO' },
      }),
    ).toBe(1);
    expect(
      await app.inject({
        method: 'GET',
        url: `/api/v1/media/assets/${video.id}/hls/master.m3u8`,
      }),
    ).toMatchObject({ statusCode: 200 });
    const crossProduct = await app.inject({
      method: 'POST',
      url: '/api/v1/home/videos',
      headers: { cookie: authorCookie },
      payload: { assetId: video.id, title: 'No', description: 'No' },
    });
    expect(crossProduct.statusCode).toBe(404);

    const otherManage = await app.inject({
      method: 'GET',
      url: `/api/v1/community-posts/${id}/manage`,
      headers: { cookie: otherCookie },
    });
    expect(otherManage.statusCode).toBe(404);
    const otherEdit = await app.inject({
      method: 'PATCH',
      url: `/api/v1/community-posts/${id}`,
      headers: { cookie: otherCookie },
      payload: { body: '탈취' },
    });
    expect(otherEdit.statusCode).toBe(404);

    const edited = await app.inject({
      method: 'PATCH',
      url: `/api/v1/community-posts/${id}`,
      headers: { cookie: authorCookie },
      payload: { body: '수정된 동영상 글', categorySlug: 'develop' },
    });
    expect(edited.statusCode).toBe(200);
    const stored = await database.client.communityPost.findUniqueOrThrow({
      where: { id },
      include: { publication: true },
    });
    expect(stored.publication.caption).toBe(stored.body);

    const like = await app.inject({
      method: 'PUT',
      url: `/api/v1/engagement/COMMUNITY_POST/${id}/like`,
      headers: { cookie: otherCookie },
    });
    expect(like.statusCode).toBe(200);
    const comment = await app.inject({
      method: 'POST',
      url: `/api/v1/engagement/COMMUNITY_POST/${id}/comments`,
      headers: { cookie: otherCookie },
      payload: { body: '좋아요' },
    });
    expect(comment.statusCode).toBe(201);

    const deniedArchive = await app.inject({
      method: 'POST',
      url: `/api/v1/community-posts/${id}/archive`,
      headers: { cookie: otherCookie },
    });
    expect(deniedArchive.statusCode).toBe(404);
    const archived = await app.inject({
      method: 'POST',
      url: `/api/v1/community-posts/${id}/archive`,
      headers: { cookie: authorCookie },
    });
    expect(archived.statusCode).toBe(200);
    expect(archived.json<{ status: string }>().status).toBe('ARCHIVED');
    expect(
      await app.inject({
        method: 'POST',
        url: `/api/v1/community-posts/${id}/archive`,
        headers: { cookie: authorCookie },
      }),
    ).toMatchObject({ statusCode: 200 });
    expect(
      await app.inject({
        method: 'GET',
        url: `/api/v1/community-posts/${id}`,
      }),
    ).toMatchObject({ statusCode: 404 });
    expect(
      await app.inject({
        method: 'GET',
        url: `/api/v1/media/assets/${video.id}/hls/master.m3u8`,
      }),
    ).toMatchObject({ statusCode: 404 });
    const archivedStored =
      await database.client.communityPost.findUniqueOrThrow({
        where: { id },
        include: { publication: true },
      });
    expect(archivedStored.publishedAt).toBeNull();
    expect(archivedStored.publication.status).toBe(PostStatus.ARCHIVED);
    expect(archivedStored.publication.publishedAt).toBeNull();
    expect(
      await database.client.mediaPlaybackClaim.count({
        where: { assetId: video.id },
      }),
    ).toBe(1);
  });
});
