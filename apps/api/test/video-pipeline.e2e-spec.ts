import 'reflect-metadata';
import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  VIDEO_PROCESSING_QUEUE,
  VIDEO_PROCESS_JOB,
  type ProcessVideoJob,
} from '@stream/media';
import { Worker } from 'bullmq';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { processVideo } from '../../media-worker/src/video-processor.js';
import { runProcess } from '../../media-worker/src/process-runner.js';
import { WorkerStorage } from '../../media-worker/src/storage.js';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';

describe('real queued video pipeline', () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;
  let worker: Worker;
  let cookie = '';
  let userId = '';
  let sourceKey = '';
  let assetId = '';
  let temporary = '';
  const email = `real-pipeline-${Date.now()}@example.test`;
  let storage: WorkerStorage;

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
    storage = new WorkerStorage();
    const redis = new URL(process.env.REDIS_URL!);
    worker = new Worker<ProcessVideoJob>(
      VIDEO_PROCESSING_QUEUE,
      async (job) => {
        expect(job.name).toBe(VIDEO_PROCESS_JOB);
        await processVideo(database.client, storage, job.data.assetId);
      },
      {
        connection: {
          host: redis.hostname,
          port: Number(redis.port || 6379),
          username: redis.username || undefined,
          password: redis.password || undefined,
        },
        concurrency: 1,
      },
    );
    const registration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        handle: `real_pipeline_${Date.now()}`,
        displayName: 'Real Pipeline Test',
        password: 'correct-horse-battery-staple',
      },
    });
    userId = registration.json<{ id: string }>().id;
    const header = registration.headers['set-cookie'];
    cookie = (Array.isArray(header) ? header[0] : header)?.split(';')[0] ?? '';
  });

  afterAll(async () => {
    await worker?.close();
    if (assetId) {
      await storage.clearPrefix(`derived/${assetId}/v2`);
      if (sourceKey) await storage.delete(sourceKey);
    }
    if (userId) {
      await database.client.communityPost.deleteMany({
        where: { authorId: userId },
      });
      await database.client.post.deleteMany({ where: { authorId: userId } });
      await database.client.mediaAsset.deleteMany({
        where: { ownerId: userId },
      });
      await database.client.user.delete({ where: { id: userId } });
    }
    await app?.close();
    if (temporary) await rm(temporary, { recursive: true, force: true });
  });

  it('uploads to MinIO, processes with FFmpeg, publishes a Community VIDEO, and gates HLS', async () => {
    temporary = await mkdtemp(join(tmpdir(), 'miru-pipeline-e2e-'));
    const fixture = join(temporary, 'fixture.mp4');
    await runProcess(
      process.env.FFMPEG_PATH ?? 'ffmpeg',
      [
        '-nostdin',
        '-y',
        '-f',
        'lavfi',
        '-i',
        'testsrc=size=320x180:rate=24',
        '-t',
        '1',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        fixture,
      ],
      60_000,
    );
    const video = await readFile(fixture);
    const session = await app.inject({
      method: 'POST',
      url: '/api/v1/media/video-uploads',
      headers: { cookie },
      payload: {
        contentType: 'video/mp4',
        byteSize: video.byteLength,
        purpose: 'POST_VIDEO',
      },
    });
    expect(session.statusCode).toBe(201);
    const upload = session.json<{ assetId: string; uploadUrl: string }>();
    assetId = upload.assetId;
    const asset = await database.client.mediaAsset.findUniqueOrThrow({
      where: { id: assetId },
    });
    sourceKey = asset.sourceKey;
    expect(
      await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': 'video/mp4' },
        body: video,
      }),
    ).toHaveProperty('status', 200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/media/video-assets/${assetId}/complete`,
          headers: { cookie },
        })
      ).statusCode,
    ).toBe(200);

    let status = '';
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      status = (
        await database.client.mediaAsset.findUniqueOrThrow({
          where: { id: assetId },
        })
      ).status;
      if (status === 'READY' || status === 'FAILED') break;
    }
    expect(status).toBe('READY');
    const privateManifest = await app.inject({
      method: 'GET',
      url: `/api/v1/media/assets/${assetId}/hls/master.m3u8`,
    });
    expect(privateManifest.statusCode).toBe(404);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/community-posts/video',
      headers: { cookie },
      payload: {
        creationId: crypto.randomUUID(),
        assetId,
        body: 'Real Community pipeline',
      },
    });
    expect(created.statusCode).toBe(201);
    const postId = created.json<{ id: string }>().id;
    const manifest = await app.inject({
      method: 'GET',
      url: `/api/v1/media/assets/${assetId}/hls/master.m3u8`,
    });
    expect(manifest.statusCode).toBe(200);
    expect(manifest.headers['content-type']).toBe(
      'application/vnd.apple.mpegurl',
    );
    const master = manifest.rawPayload.toString();
    expect(master).toContain('#EXT-X-STREAM-INF');
    const variantPath = master
      .split('\n')
      .find((line) => line.endsWith('/index.m3u8'));
    expect(variantPath).toBeTruthy();
    const variant = await app.inject({
      method: 'GET',
      url: `/api/v1/media/assets/${assetId}/hls/${variantPath}`,
    });
    expect(variant.statusCode).toBe(200);
    expect(variant.headers['content-type']).toBe(
      'application/vnd.apple.mpegurl',
    );
    const segment = variant.rawPayload
      .toString()
      .split('\n')
      .find((line) => line.endsWith('.ts'));
    expect(segment).toBeTruthy();
    const rendition = variantPath!.split('/')[0];
    const segmentResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/media/assets/${assetId}/hls/${rendition}/${segment}`,
    });
    expect(segmentResponse.statusCode).toBe(200);
    expect(segmentResponse.headers['content-type']).toBe('video/mp2t');
    expect(segmentResponse.headers['cache-control']).toContain('immutable');
    const archived = await app.inject({
      method: 'POST',
      url: `/api/v1/community-posts/${postId}/archive`,
      headers: { cookie },
    });
    expect(archived.statusCode).toBe(200);
    const archivedManifest = await app.inject({
      method: 'GET',
      url: `/api/v1/media/assets/${assetId}/hls/master.m3u8`,
    });
    expect(archivedManifest.statusCode).toBe(404);
  }, 120_000);
});
