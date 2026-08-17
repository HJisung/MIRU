import 'reflect-metadata';
import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { MediaKind, MediaPurpose, MediaStatus } from '@stream/database';
import { VIDEO_PIPELINE_VERSION, VIDEO_PROCESSING_QUEUE } from '@stream/media';
import { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';

describe('video processing operations', () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;
  let memberCookie = '';
  let adminCookie = '';
  let memberId = '';
  let adminId = '';
  let assetId = '';
  const redis = new URL(process.env.REDIS_URL!);

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.register(fastifyCookie);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    database = app.get(DatabaseService);
    const register = async (label: string) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `${label}-${Date.now()}@example.test`,
          handle: `${label}_${Date.now()}`,
          displayName: label,
          password: 'correct-horse-battery-staple',
        },
      });
      const header = response.headers['set-cookie'];
      return {
        id: response.json<{ id: string }>().id,
        cookie:
          (Array.isArray(header) ? header[0] : header)?.split(';')[0] ?? '',
      };
    };
    const member = await register('media_ops_member');
    const admin = await register('media_ops_admin');
    memberId = member.id;
    memberCookie = member.cookie;
    adminId = admin.id;
    adminCookie = admin.cookie;
    await database.client.user.update({
      where: { id: adminId },
      data: { role: 'ADMIN' },
    });
    const asset = await database.client.mediaAsset.create({
      data: {
        ownerId: memberId,
        kind: MediaKind.VIDEO,
        purpose: MediaPurpose.LONG_VIDEO,
        status: MediaStatus.FAILED,
        sourceKey: `operations/${crypto.randomUUID()}`,
        pipelineVersion: VIDEO_PIPELINE_VERSION,
        failureCode: 'VIDEO_CONTAINER_NOT_ALLOWED',
        failureMessage: 'invalid fixture',
      },
    });
    assetId = asset.id;
  });

  afterAll(async () => {
    const queue = new Queue(VIDEO_PROCESSING_QUEUE, {
      connection: { host: redis.hostname, port: Number(redis.port || 6379) },
    });
    const job = await queue.getJob(`${assetId}-v${VIDEO_PIPELINE_VERSION}`);
    if (job && (await job.getState()) !== 'active') await job.remove();
    await queue.close();
    await database.client.mediaAsset.deleteMany({ where: { id: assetId } });
    await database.client.user.deleteMany({
      where: { id: { in: [memberId, adminId] } },
    });
    await app.close();
  });

  it('keeps queue and failed asset operations private to administrators', async () => {
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/media/operations/video-queue',
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/v1/media/operations/video-assets/${assetId}`,
          headers: { cookie: memberCookie },
        })
      ).statusCode,
    ).toBe(403);
    const inspected = await app.inject({
      method: 'GET',
      url: `/api/v1/media/operations/video-assets/${assetId}`,
      headers: { cookie: adminCookie },
    });
    expect(inspected.statusCode).toBe(200);
    expect(inspected.json<{ failureCode: string }>().failureCode).toBe(
      'VIDEO_CONTAINER_NOT_ALLOWED',
    );
    const counts = await app.inject({
      method: 'GET',
      url: '/api/v1/media/operations/video-queue',
      headers: { cookie: adminCookie },
    });
    expect(counts.statusCode).toBe(200);
    expect(counts.json()).toHaveProperty('waiting');
  });

  it('retries the same failed MediaAsset with deterministic job identity', async () => {
    const before = await database.client.mediaAsset.count({
      where: { ownerId: memberId },
    });
    const retry = await app.inject({
      method: 'POST',
      url: `/api/v1/media/operations/video-assets/${assetId}/retry`,
      headers: { cookie: adminCookie },
    });
    expect(retry.statusCode).toBe(200);
    expect(
      await database.client.mediaAsset.count({
        where: { ownerId: memberId },
      }),
    ).toBe(before);
    const sameAsset = await database.client.mediaAsset.findUniqueOrThrow({
      where: { id: assetId },
    });
    expect(sameAsset.id).toBe(assetId);
    expect([MediaStatus.UPLOADED, MediaStatus.PROCESSING]).toContain(
      sameAsset.status,
    );
    expect(retry.json<{ jobState: string }>().jobState).toMatch(
      /waiting|active|delayed/,
    );
    let status: MediaStatus = MediaStatus.UPLOADED;
    for (let attempt = 0; attempt < 300; attempt += 1) {
      status = (
        await database.client.mediaAsset.findUniqueOrThrow({
          where: { id: assetId },
        })
      ).status;
      if (status === MediaStatus.FAILED) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(status).toBe(MediaStatus.FAILED);
    const inspected = await app.inject({
      method: 'GET',
      url: `/api/v1/media/operations/video-assets/${assetId}`,
      headers: { cookie: adminCookie },
    });
    expect(
      inspected.json<{ failureCode: string | null }>().failureCode,
    ).toBeTruthy();
  }, 40_000);
});
