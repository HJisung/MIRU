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
  SeriesSubmissionStatus,
  SeriesWorkType,
} from '@stream/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';

describe('processed video product attachments', () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;
  let userId = '';
  let cookie = '';
  let singleSeriesId = '';
  let episodicSeriesId = '';
  const email = `product-video-${Date.now()}@example.test`;

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
    const registration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        handle: `product_video_${Date.now()}`,
        displayName: 'Product Video Test',
        password: 'correct-horse-battery-staple',
      },
    });
    userId = registration.json<{ id: string }>().id;
    const header = registration.headers['set-cookie'];
    cookie = (Array.isArray(header) ? header[0] : header)?.split(';')[0] ?? '';
    const [single, episodic] = await Promise.all([
      database.client.series.create({
        data: {
          creatorId: userId,
          title: 'Real single work',
          synopsis: 'A reviewed single work.',
          workType: SeriesWorkType.SINGLE_WORK,
          publicationStatus: DomainPublicationStatus.DRAFT,
          engagementTarget: {
            create: { type: EngagementTargetType.SERIES },
          },
        },
      }),
      database.client.series.create({
        data: {
          creatorId: userId,
          title: 'Real episodic work',
          synopsis: 'A reviewed episodic work.',
          workType: SeriesWorkType.EPISODIC,
          publicationStatus: DomainPublicationStatus.DRAFT,
          engagementTarget: {
            create: { type: EngagementTargetType.SERIES },
          },
        },
      }),
    ]);
    singleSeriesId = single.id;
    episodicSeriesId = episodic.id;
    await database.client.seriesSubmission.createMany({
      data: [single.id, episodic.id].map((seriesId) => ({
        seriesId,
        applicantId: userId,
        status: SeriesSubmissionStatus.APPROVED,
        submittedAt: new Date(),
        reviewedAt: new Date(),
      })),
    });
  });

  afterAll(async () => {
    if (userId) {
      await database.client.shortForm.deleteMany({
        where: { creatorId: userId },
      });
      await database.client.homeVideo.deleteMany({
        where: { creatorId: userId },
      });
      await database.client.series.deleteMany({ where: { creatorId: userId } });
      await database.client.post.deleteMany({ where: { authorId: userId } });
      await database.client.mediaAsset.deleteMany({
        where: { ownerId: userId },
      });
      await database.client.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  async function readyAsset(purpose: MediaPurpose) {
    return database.client.mediaAsset.create({
      data: {
        ownerId: userId,
        kind: MediaKind.VIDEO,
        purpose,
        status: MediaStatus.READY,
        sourceKey: `test/${crypto.randomUUID()}`,
        publicUrl: `/api/v1/media/assets/${crypto.randomUUID()}/hls/master.m3u8`,
        mimeType: 'application/vnd.apple.mpegurl',
        width: 320,
        height: 180,
        durationMs: 2_000,
        hlsManifestKey: `test/${crypto.randomUUID()}/master.m3u8`,
        posterKey: `test/${crypto.randomUUID()}/poster.jpg`,
      },
    });
  }

  it('attaches a READY video directly to SINGLE_WORK playback', async () => {
    const asset = await readyAsset(MediaPurpose.LONG_VIDEO);
    const attached = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${singleSeriesId}/single-work/video`,
      headers: { cookie },
      payload: { assetId: asset.id },
    });
    expect(attached.statusCode).toBe(200);
    const retried = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${singleSeriesId}/single-work/video`,
      headers: { cookie },
      payload: { assetId: asset.id },
    });
    expect(retried.statusCode).toBe(200);
    expect(retried.json<{ id: string }>().id).toBe(singleSeriesId);
    const publishSeries = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${singleSeriesId}/publish`,
      headers: { cookie },
    });
    expect(publishSeries.statusCode).toBe(200);
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/series/${singleSeriesId}`,
    });
    expect(
      detail.json<{ singleWork: { media: { id: string; url: string } } }>()
        .singleWork.media.id,
    ).toBe(asset.id);
    expect(
      detail.json<{ singleWork: { media: { url: string } } }>().singleWork.media
        .url,
    ).toContain('/master.m3u8');
  });

  it('creates and explicitly publishes a READY episodic video', async () => {
    const asset = await readyAsset(MediaPurpose.LONG_VIDEO);
    const created = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${episodicSeriesId}/episodes`,
      headers: { cookie },
      payload: {
        assetId: asset.id,
        episodeNumber: 1,
        title: 'Real episode',
        synopsis: 'Created from the shared pipeline.',
      },
    });
    expect(created.statusCode).toBe(201);
    const episodeId = created.json<{ id: string }>().id;
    const retried = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${episodicSeriesId}/episodes`,
      headers: { cookie },
      payload: {
        assetId: asset.id,
        episodeNumber: 1,
        title: 'Real episode',
        synopsis: 'Created from the shared pipeline.',
      },
    });
    expect(retried.json<{ id: string }>().id).toBe(episodeId);
    expect(
      await database.client.seriesEpisode.count({
        where: { videoAssetId: asset.id },
      }),
    ).toBe(1);
    const crossProductAttach = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${singleSeriesId}/single-work/video`,
      headers: { cookie },
      payload: { assetId: asset.id },
    });
    expect(crossProductAttach.statusCode).toBe(404);
    const publishSeries = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${episodicSeriesId}/publish`,
      headers: { cookie },
    });
    expect(publishSeries.statusCode).toBe(200);
    const publish = await app.inject({
      method: 'POST',
      url: `/api/v1/series/episodes/${episodeId}/publish`,
      headers: { cookie },
    });
    expect(publish.statusCode).toBe(200);
    const publishedEpisode = publish.json<{
      media: { id: string; url: string };
    }>().media;
    expect(publishedEpisode.id).toBe(asset.id);
    expect(publishedEpisode.url).toContain('/master.m3u8');
    const publishRetry = await app.inject({
      method: 'POST',
      url: `/api/v1/series/episodes/${episodeId}/publish`,
      headers: { cookie },
    });
    expect(publishRetry.statusCode).toBe(200);
  });

  it('creates a VIDEO Shortform while preserving promotion identity', async () => {
    const asset = await readyAsset(MediaPurpose.SHORT_VIDEO);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/shortforms/videos',
      headers: { cookie },
      payload: {
        assetId: asset.id,
        title: 'Real short',
        description: 'A processed vertical video.',
        musicKey: 'catalog:test-track',
        promotedKind: 'SERIES',
        promotedId: episodicSeriesId,
      },
    });
    const shortformId = created.json<{ id: string }>().id;
    const retried = await app.inject({
      method: 'POST',
      url: '/api/v1/shortforms/videos',
      headers: { cookie },
      payload: {
        assetId: asset.id,
        title: 'Real short',
        description: 'A processed vertical video.',
        musicKey: 'catalog:test-track',
        promotedKind: 'SERIES',
        promotedId: episodicSeriesId,
      },
    });
    expect(retried.json<{ id: string }>().id).toBe(shortformId);
    expect(
      await database.client.shortForm.count({
        where: { media: { some: { assetId: asset.id } } },
      }),
    ).toBe(1);
    const publish = await app.inject({
      method: 'POST',
      url: `/api/v1/shortforms/${shortformId}/publish`,
      headers: { cookie },
    });
    expect(publish.statusCode).toBe(200);
    const body = publish.json<{
      media: Array<{ id: string; url: string }>;
      promotedContent: { kind: string; id: string };
    }>();
    expect(body.media[0]?.id).toBe(asset.id);
    expect(body.media[0]?.url).toContain('/master.m3u8');
    expect(body.promotedContent).toEqual({
      kind: 'SERIES',
      id: episodicSeriesId,
      title: 'Real episodic work',
    });
    const publishRetry = await app.inject({
      method: 'POST',
      url: `/api/v1/shortforms/${shortformId}/publish`,
      headers: { cookie },
    });
    expect(publishRetry.statusCode).toBe(200);
  });

  it('allows at most one incompatible attachment under real concurrency', async () => {
    const asset = await readyAsset(MediaPurpose.LONG_VIDEO);
    const [home, episode] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/home/videos',
        headers: { cookie },
        payload: {
          assetId: asset.id,
          title: 'Concurrent Home',
          description: 'One winner only.',
        },
      }),
      app.inject({
        method: 'POST',
        url: `/api/v1/series/${episodicSeriesId}/episodes`,
        headers: { cookie },
        payload: {
          assetId: asset.id,
          episodeNumber: 99,
          title: 'Concurrent Episode',
          synopsis: 'One winner only.',
        },
      }),
    ]);
    expect(
      [home.statusCode, episode.statusCode].filter((code) => code < 300),
    ).toHaveLength(1);
    const attachments = await Promise.all([
      database.client.homeVideo.count({ where: { videoAssetId: asset.id } }),
      database.client.seriesEpisode.count({
        where: { videoAssetId: asset.id },
      }),
      database.client.mediaPlaybackClaim.count({
        where: { assetId: asset.id },
      }),
    ]);
    expect(attachments[0] + attachments[1]).toBe(1);
    expect(attachments[2]).toBe(1);
  });
});
