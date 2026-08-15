import 'reflect-metadata';
import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';

describe('direct image upload and publish (MinIO + PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;
  const email = `upload-${Date.now()}@example.test`;
  const handle = `upload_${Date.now()}`;
  let cookie = '';
  let postId = '';

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
        handle,
        displayName: 'Upload Test',
        password: 'correct-horse-battery-staple',
      },
    });
    const header = registration.headers['set-cookie'];
    const setCookie = Array.isArray(header) ? header[0] : header;
    cookie = setCookie?.split(';')[0] ?? '';
  });

  afterAll(async () => {
    const user = await database.client.user.findUnique({ where: { email } });
    if (user) {
      await database.client.communityPost.deleteMany({
        where: { authorId: user.id },
      });
      await database.client.post.deleteMany({ where: { authorId: user.id } });
      await database.client.mediaAsset.deleteMany({
        where: { ownerId: user.id },
      });
      await database.client.user.delete({ where: { id: user.id } });
    }
    await app.close();
  });

  it('uploads directly, validates the image, and publishes it', async () => {
    const image = await readFile(
      resolve(process.cwd(), '../web/public/demo/dawn-city.png'),
    );
    const session = await app.inject({
      method: 'POST',
      url: '/api/v1/media/image-uploads',
      headers: { cookie },
      payload: { contentType: 'image/png', byteSize: image.byteLength },
    });
    expect(session.statusCode).toBe(201);
    const upload = session.json<{ assetId: string; uploadUrl: string }>();

    const storageResponse = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: image,
    });
    expect(storageResponse.status).toBe(200);

    const complete = await app.inject({
      method: 'POST',
      url: `/api/v1/media/assets/${upload.assetId}/complete`,
      headers: { cookie },
    });
    expect(complete.statusCode).toBe(200);
    expect(complete.json<{ status: string }>().status).toBe('READY');

    const post = await app.inject({
      method: 'POST',
      url: '/api/v1/posts/images',
      headers: { cookie },
      payload: { assetId: upload.assetId, caption: 'A real uploaded image.' },
    });
    expect(post.statusCode).toBe(201);
    postId = post.json<{ id: string }>().id;
  });

  it('serves the published object without exposing its private key', async () => {
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/posts/${postId}`,
    });
    const media = detail.json<{
      media: Array<{ url: string; width: number }>;
    }>().media[0];
    expect(media?.url).toMatch(/^\/api\/v1\/media\/assets\//);
    expect(media?.url).not.toContain('originals/');
    expect(media?.width).toBeGreaterThan(0);

    const content = await app.inject({ method: 'GET', url: media?.url });
    expect(content.statusCode).toBe(200);
    expect(content.headers['content-type']).toBe('image/png');
    expect(content.rawPayload.byteLength).toBeGreaterThan(100);
  });
});
