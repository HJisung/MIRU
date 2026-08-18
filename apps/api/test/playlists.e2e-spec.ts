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
} from '@stream/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';

describe('product-native Playlists', () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;
  let owner = { id: '', cookie: '' };
  let other = { id: '', cookie: '' };
  const productIds: string[] = [];

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
    owner = await register('playlist_owner');
    other = await register('playlist_other');
    productIds.push(await createHome('One'), await createHome('Two'));
  });

  afterAll(async () => {
    const userIds = [owner.id, other.id].filter(Boolean);
    await database.client.playlist.deleteMany({
      where: { ownerId: { in: userIds } },
    });
    await database.client.homeVideo.deleteMany({
      where: { creatorId: { in: userIds } },
    });
    await database.client.mediaAsset.deleteMany({
      where: { ownerId: { in: userIds } },
    });
    await database.client.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it('keeps ownership and privacy while adding and atomically reordering native products', async () => {
    const created = await call('POST', '/playlists', owner.cookie, {
      title: 'Watch later',
    });
    expect(created.statusCode).toBe(201);
    const playlistId = created.json<{ id: string; visibility: string }>().id;
    expect(created.json<{ visibility: string }>().visibility).toBe('PRIVATE');
    expect((await call('GET', `/playlists/${playlistId}`)).statusCode).toBe(
      404,
    );
    expect(
      (
        await call('POST', `/playlists/${playlistId}/items`, other.cookie, {
          type: 'HOME_VIDEO',
          id: productIds[0],
        })
      ).statusCode,
    ).toBe(403);

    for (const id of productIds) {
      expect(
        (
          await call('POST', `/playlists/${playlistId}/items`, owner.cookie, {
            type: 'HOME_VIDEO',
            id,
          })
        ).statusCode,
      ).toBe(201);
    }
    expect(
      (
        await call('POST', `/playlists/${playlistId}/items`, owner.cookie, {
          type: 'HOME_VIDEO',
          id: productIds[0],
        })
      ).statusCode,
    ).toBe(409);
    const managed = await call(
      'GET',
      `/playlists/${playlistId}/manage`,
      owner.cookie,
    );
    const items = managed.json<{
      items: Array<{ id: string; target: { id: string } }>;
    }>().items;
    expect(items.map((item) => item.target.id)).toEqual(productIds);

    const swapped = await call(
      'PUT',
      `/playlists/${playlistId}/items/order`,
      owner.cookie,
      { itemIds: items.map((item) => item.id).reverse() },
    );
    expect(swapped.statusCode).toBe(200);
    expect(
      swapped
        .json<{ items: Array<{ target: { id: string } }> }>()
        .items.map((item) => item.target.id),
    ).toEqual([...productIds].reverse());
    expect(
      (
        await call(
          'PUT',
          `/playlists/${playlistId}/items/order`,
          owner.cookie,
          { itemIds: [items[0].id, items[0].id] },
        )
      ).statusCode,
    ).toBe(400);
    const unchanged = await call(
      'GET',
      `/playlists/${playlistId}/manage`,
      owner.cookie,
    );
    expect(
      unchanged
        .json<{ items: Array<{ target: { id: string } }> }>()
        .items.map((item) => item.target.id),
    ).toEqual([...productIds].reverse());

    expect(
      (
        await call('PATCH', `/playlists/${playlistId}`, owner.cookie, {
          visibility: 'UNLISTED',
        })
      ).statusCode,
    ).toBe(200);
    expect((await call('GET', `/playlists/${playlistId}`)).statusCode).toBe(
      200,
    );
    expect(
      (
        await call('PATCH', `/playlists/${playlistId}`, owner.cookie, {
          visibility: 'PRIVATE',
        })
      ).statusCode,
    ).toBe(200);
    expect((await call('GET', `/playlists/${playlistId}`)).statusCode).toBe(
      404,
    );
    expect(
      (
        await call('PATCH', `/playlists/${playlistId}`, owner.cookie, {
          visibility: 'PUBLIC',
        })
      ).statusCode,
    ).toBe(200);
    const publicView = await call('GET', `/playlists/${playlistId}`);
    expect(publicView.statusCode).toBe(200);
    expect(JSON.stringify(publicView.json())).not.toContain('publicationId');

    await database.client.homeVideo.update({
      where: { id: productIds[1] },
      data: { status: DomainPublicationStatus.REMOVED, publishedAt: null },
    });
    const tombstone = await call('GET', `/playlists/${playlistId}`);
    expect(
      tombstone.json<{
        items: Array<{
          target: { id: string };
          available: boolean;
          href: string | null;
        }>;
      }>().items[0],
    ).toMatchObject({
      target: { id: productIds[1] },
      available: false,
      href: null,
    });

    const removed = await call(
      'DELETE',
      `/playlists/${playlistId}/items/${items[0].id}`,
      owner.cookie,
    );
    expect(removed.statusCode).toBe(200);
    expect(
      removed
        .json<{ items: Array<{ target: { id: string } }> }>()
        .items.map((item) => item.target.id),
    ).toEqual([productIds[1]]);
  });

  async function createHome(title: string) {
    const asset = await database.client.mediaAsset.create({
      data: {
        ownerId: owner.id,
        kind: MediaKind.VIDEO,
        purpose: MediaPurpose.LONG_VIDEO,
        status: MediaStatus.READY,
        sourceKey: `playlist/${crypto.randomUUID()}`,
        publicUrl: '/demo/playlist.png',
        mimeType: 'video/mp4',
      },
    });
    const home = await database.client.homeVideo.create({
      data: {
        creatorId: owner.id,
        videoAssetId: asset.id,
        title,
        description: title,
        status: DomainPublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        engagementTarget: { create: { type: EngagementTargetType.HOME_VIDEO } },
      },
    });
    return home.id;
  }

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
});
