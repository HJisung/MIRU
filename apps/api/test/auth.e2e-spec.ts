import 'reflect-metadata';
import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';

describe('account session flow (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let database: DatabaseService;
  const email = `auth-${Date.now()}@example.test`;
  const handle = `auth_${Date.now()}`;
  const password = 'correct-horse-battery-staple';
  let cookie = '';

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
  });

  afterAll(async () => {
    await database.client.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('registers an account and returns an HTTP-only session cookie', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, handle, displayName: 'Auth Test', password },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json<Record<string, unknown>>();
    expect(body.email).toBe(email);
    expect(body).not.toHaveProperty('passwordHash');
    const setCookieHeader = response.headers['set-cookie'];
    const setCookie = Array.isArray(setCookieHeader)
      ? setCookieHeader[0]
      : setCookieHeader;
    cookie = setCookie?.split(';')[0] ?? '';
    expect(setCookie).toContain('HttpOnly');
    expect(cookie).toContain('stream_session=');
  });

  it('loads the current session and revokes it on logout', async () => {
    const current = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/session',
      headers: { cookie },
    });
    expect(current.statusCode).toBe(200);
    expect(current.json<{ handle: string }>().handle).toBe(handle);

    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie },
    });
    expect(logout.statusCode).toBe(204);

    const revoked = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/session',
      headers: { cookie },
    });
    expect(revoked.statusCode).toBe(401);
  });

  it('uses one generic error for invalid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'definitely-not-the-password' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json<{ message: string }>().message).toBe(
      'Invalid email or password',
    );
  });
});
