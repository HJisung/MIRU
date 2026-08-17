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

describe('Series Creator Studio lifecycle', () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;
  let creator = { id: '', cookie: '' };
  let other = { id: '', cookie: '' };
  let admin = { id: '', cookie: '' };
  let singleSeriesId = '';
  let approvedSubmissionId = '';

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

    const register = async (label: string) => {
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
        cookie:
          (Array.isArray(header) ? header[0] : header)?.split(';')[0] ?? '',
      };
    };
    creator = await register('studio_creator');
    other = await register('studio_other');
    admin = await register('studio_admin');
    await database.client.user.update({
      where: { id: admin.id },
      data: { role: 'ADMIN' },
    });
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

  it('enforces ownership, stable review, withdrawal, rejection and history', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/series',
      headers: { cookie: creator.cookie },
      payload: {
        title: '첫 번째 작품',
        synopsis: '심사를 위한 안정적인 작품 설명입니다.',
        description: 'Creator Studio에서 만든 초안',
        workType: 'SINGLE_WORK',
        genres: ['영화'],
        tags: ['첫 작품'],
        ageRating: '12',
        productionInfo: { studio: 'MIRU Studio' },
        releaseDate: '2026-08-18',
      },
    });
    expect(created.statusCode).toBe(201);
    singleSeriesId = created.json<{ id: string }>().id;

    for (const request of [
      { method: 'GET', url: `/api/v1/series/${singleSeriesId}/manage` },
      { method: 'PATCH', url: `/api/v1/series/${singleSeriesId}` },
      { method: 'POST', url: `/api/v1/series/${singleSeriesId}/submissions` },
    ] as const) {
      const denied = await app.inject({
        ...request,
        headers: { cookie: other.cookie },
        payload:
          request.method === 'PATCH' ? { title: '훔친 제목' } : undefined,
      });
      expect(denied.statusCode).toBe(404);
    }

    const edited = await app.inject({
      method: 'PATCH',
      url: `/api/v1/series/${singleSeriesId}`,
      headers: { cookie: creator.cookie },
      payload: { title: '수정한 첫 번째 작품', tags: ['영화', '독립'] },
    });
    expect(edited.statusCode).toBe(200);

    const [firstSubmit, duplicateSubmit] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/api/v1/series/${singleSeriesId}/submissions`,
        headers: { cookie: creator.cookie },
      }),
      app.inject({
        method: 'POST',
        url: `/api/v1/series/${singleSeriesId}/submissions`,
        headers: { cookie: creator.cookie },
      }),
    ]);
    expect(firstSubmit.statusCode).toBe(200);
    expect(duplicateSubmit.statusCode).toBe(200);
    expect(firstSubmit.json<{ id: string }>().id).toBe(
      duplicateSubmit.json<{ id: string }>().id,
    );
    expect(
      await database.client.seriesSubmission.count({
        where: { seriesId: singleSeriesId, status: 'SUBMITTED' },
      }),
    ).toBe(1);

    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/api/v1/series/${singleSeriesId}`,
          headers: { cookie: creator.cookie },
          payload: { title: '심사 중 몰래 변경' },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/v1/series/${singleSeriesId}`,
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/admin/series-submissions',
          headers: { cookie: creator.cookie },
        })
      ).statusCode,
    ).toBe(403);

    const withdrawn = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${singleSeriesId}/submissions/${firstSubmit.json<{ id: string }>().id}/withdraw`,
      headers: { cookie: creator.cookie },
    });
    expect(withdrawn.json<{ status: string }>().status).toBe('WITHDRAWN');

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/series/${singleSeriesId}`,
      headers: { cookie: creator.cookie },
      payload: { synopsis: '철회 후 수정한 작품 설명입니다.' },
    });
    const resubmitted = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${singleSeriesId}/submissions`,
      headers: { cookie: creator.cookie },
    });
    const rejected = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/series-submissions/${resubmitted.json<{ id: string }>().id}/reject`,
      headers: { cookie: admin.cookie },
      payload: { reason: '시놉시스에 제작 의도를 더 구체적으로 적어주세요.' },
    });
    expect(rejected.json<{ status: string }>().status).toBe('REJECTED');
    expect(
      rejected.json<{ decisionReason: string }>().decisionReason,
    ).toContain('제작 의도');

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/series/${singleSeriesId}`,
      headers: { cookie: creator.cookie },
      payload: { synopsis: '제작 의도와 관객에게 전할 이야기를 보강했습니다.' },
    });
    const finalSubmit = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${singleSeriesId}/submissions`,
      headers: { cookie: creator.cookie },
    });
    approvedSubmissionId = finalSubmit.json<{ id: string }>().id;
    const approved = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/series-submissions/${approvedSubmissionId}/approve`,
      headers: { cookie: admin.cookie },
      payload: { reason: '작품 정보와 공개 권한을 확인했습니다.' },
    });
    expect(approved.json<{ status: string }>().status).toBe('APPROVED');
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/admin/series-submissions/${approvedSubmissionId}/reject`,
          headers: { cookie: admin.cookie },
          payload: { reason: '이미 처리된 요청입니다.' },
        })
      ).statusCode,
    ).toBe(400);
    const managed = await app.inject({
      method: 'GET',
      url: `/api/v1/series/${singleSeriesId}/manage`,
      headers: { cookie: creator.cookie },
    });
    expect(managed.json<{ submissions: unknown[] }>().submissions).toHaveLength(
      3,
    );
    expect(managed.json<{ canManageContent: boolean }>().canManageContent).toBe(
      true,
    );
  });

  it('publishes approved SINGLE_WORK and EPISODIC works without DB shortcuts', async () => {
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/series/${singleSeriesId}/publish`,
          headers: { cookie: creator.cookie },
        })
      ).statusCode,
    ).toBe(400);

    const singleAsset = await readyAsset(creator.id);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/series/${singleSeriesId}/single-work/video`,
          headers: { cookie: creator.cookie },
          payload: { assetId: singleAsset.id },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/series/${singleSeriesId}/publish`,
          headers: { cookie: creator.cookie },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/v1/series/${singleSeriesId}`,
        })
      ).statusCode,
    ).toBe(200);

    const episodic = await createAndApprove('EPISODIC');
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/series/${episodic}/publish`,
          headers: { cookie: creator.cookie },
        })
      ).statusCode,
    ).toBe(400);
    const episodeAsset = await readyAsset(creator.id);
    const episode = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${episodic}/episodes`,
      headers: { cookie: creator.cookie },
      payload: {
        assetId: episodeAsset.id,
        episodeNumber: 1,
        title: '첫 번째 에피소드',
        synopsis: '공개 가능한 에피소드 초안',
      },
    });
    expect(episode.statusCode).toBe(201);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/series/${episodic}/publish`,
          headers: { cookie: creator.cookie },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/series/episodes/${episode.json<{ id: string }>().id}/publish`,
          headers: { cookie: creator.cookie },
        })
      ).statusCode,
    ).toBe(200);
  });

  it('allows an administrator-created ready Series to publish without review', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/series',
      headers: { cookie: admin.cookie },
      payload: {
        title: '관리자 편성 작품',
        synopsis: '관리자가 직접 편성한 작품입니다.',
        workType: 'SINGLE_WORK',
      },
    });
    const id = created.json<{ id: string }>().id;
    const asset = await readyAsset(admin.id);
    await app.inject({
      method: 'POST',
      url: `/api/v1/series/${id}/single-work/video`,
      headers: { cookie: admin.cookie },
      payload: { assetId: asset.id },
    });
    const published = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${id}/publish`,
      headers: { cookie: admin.cookie },
    });
    expect(published.statusCode).toBe(200);
  });

  async function createAndApprove(workType: 'SINGLE_WORK' | 'EPISODIC') {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/series',
      headers: { cookie: creator.cookie },
      payload: {
        title: `${workType} 작품`,
        synopsis: '심사와 공개 흐름을 검증하는 작품입니다.',
        workType,
      },
    });
    const id = created.json<{ id: string }>().id;
    const submitted = await app.inject({
      method: 'POST',
      url: `/api/v1/series/${id}/submissions`,
      headers: { cookie: creator.cookie },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/series-submissions/${submitted.json<{ id: string }>().id}/approve`,
      headers: { cookie: admin.cookie },
      payload: { reason: '출품 요건을 충족했습니다.' },
    });
    return id;
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
        sourceKey: `studio/${id}`,
        publicUrl: `/api/v1/media/assets/${id}/hls/master.m3u8`,
        mimeType: 'application/vnd.apple.mpegurl',
        width: 1280,
        height: 720,
        durationMs: 2_000,
        hlsManifestKey: `derived/${id}/v2/master.m3u8`,
        posterKey: `derived/${id}/v2/poster.jpg`,
        pipelineVersion: 2,
      },
    });
  }
});
