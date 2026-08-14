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
    expect(detail.json<{ media: unknown[] }>().media).toHaveLength(1);
  });
});
