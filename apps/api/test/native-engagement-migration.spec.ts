import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { afterAll, describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
try {
  loadEnvFile(resolve(root, '.env'));
} catch {
  // CI may provide DATABASE_URL directly without a workspace .env file.
}
const requireFromDatabase = createRequire(
  resolve(root, 'packages/database/package.json'),
);
const { Client } = requireFromDatabase('pg') as {
  Client: new (options: { connectionString?: string }) => PgClient;
};
const migrationRoot = resolve(root, 'packages/database/prisma/migrations');
const adminUrl = process.env.DATABASE_URL;
const createdDatabases: string[] = [];

describe.skipIf(!adminUrl)('native engagement SQL backfill', () => {
  afterAll(async () => {
    for (const database of createdDatabases) await dropDatabase(database);
  });

  it('preserves mapped rows, recomputes counters, and retains unmapped residual data', async () => {
    const client = await legacyDatabase();
    await client.query(fixtureSql(false));
    await client.query(
      await migrationSql('20260818005000_native_engagement_and_moderation'),
    );

    const target = await client.query<{
      id: string;
      likeCount: number;
      commentCount: number;
    }>(
      `SELECT "id", "likeCount", "commentCount" FROM "EngagementTarget" WHERE "homeVideoId" = '50000000-0000-4000-8000-000000000099'`,
    );
    expect(target.rows).toHaveLength(1);
    expect(target.rows[0]).toMatchObject({ likeCount: 1, commentCount: 1 });
    expect(
      (
        await client.query(
          `SELECT 1 FROM "EngagementLike" WHERE "userId" = '10000000-0000-4000-8000-000000000092'`,
        )
      ).rowCount,
    ).toBe(1);
    expect(
      (
        await client.query(
          `SELECT "id", "body" FROM "EngagementComment" WHERE "id" = '91000000-0000-4000-8000-000000000001'`,
        )
      ).rows[0],
    ).toEqual({
      id: '91000000-0000-4000-8000-000000000001',
      body: 'preserved comment',
    });
    expect(
      (
        await client.query(
          `SELECT "status", "reason", "details" FROM "EngagementReport" WHERE "id" = '92000000-0000-4000-8000-000000000001'`,
        )
      ).rows[0],
    ).toEqual({
      status: 'REVIEWING',
      reason: 'SPAM',
      details: 'preserved report',
    });
    expect(
      (
        await client.query(
          `SELECT 1 FROM "PostLike" WHERE "postId" = '30000000-0000-4000-8000-000000000098'`,
        )
      ).rowCount,
    ).toBe(1);
    expect(
      (
        await client.query(
          `SELECT 1 FROM "EngagementLike" l JOIN "EngagementTarget" t ON t."id" = l."targetId" WHERE l."userId" = '10000000-0000-4000-8000-000000000092' AND t."homeVideoId" IS NULL`,
        )
      ).rowCount,
    ).toBe(0);
    await client.end();
  });

  it('aborts explicitly when one compatibility Post maps to multiple products', async () => {
    const client = await legacyDatabase();
    await client.query(fixtureSql(true));
    await expect(
      client.query(
        await migrationSql('20260818005000_native_engagement_and_moderation'),
      ),
    ).rejects.toThrow(/Ambiguous legacy Post to product engagement mapping/);
    expect(
      (
        await client.query(
          `SELECT to_regclass('public."EngagementTarget"') AS name`,
        )
      ).rows[0]?.name,
    ).toBeNull();
    await client.end();
  });
});

async function legacyDatabase() {
  const database = `miru_migration_${Date.now()}_${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`;
  createdDatabases.push(database);
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  await admin.end();
  const url = new URL(adminUrl!);
  url.pathname = `/${database}`;
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  const names = (await readdir(migrationRoot))
    .filter((name) => name < '20260818005000_native_engagement_and_moderation')
    .sort();
  for (const name of names) await client.query(await migrationSql(name));
  return client;
}

async function migrationSql(name: string) {
  return readFile(resolve(migrationRoot, name, 'migration.sql'), 'utf8');
}

async function dropDatabase(database: string) {
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
    [database],
  );
  await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
  await admin.end();
}

function fixtureSql(ambiguous: boolean) {
  return `
    INSERT INTO "User" ("id", "email", "handle", "displayName", "updatedAt") VALUES
      ('10000000-0000-4000-8000-000000000091', 'creator@migration.test', 'migration_creator', 'Creator', CURRENT_TIMESTAMP),
      ('10000000-0000-4000-8000-000000000092', 'viewer@migration.test', 'migration_viewer', 'Viewer', CURRENT_TIMESTAMP);
    INSERT INTO "Post" ("id", "authorId", "format", "status", "visibility", "likeCount", "commentCount", "updatedAt") VALUES
      ('30000000-0000-4000-8000-000000000099', '10000000-0000-4000-8000-000000000091', 'LONG_VIDEO', 'PUBLISHED', 'PUBLIC', 99, 88, CURRENT_TIMESTAMP),
      ('30000000-0000-4000-8000-000000000098', '10000000-0000-4000-8000-000000000091', 'IMAGE', 'PUBLISHED', 'PUBLIC', 1, 0, CURRENT_TIMESTAMP);
    INSERT INTO "HomeVideo" ("id", "creatorId", "publicationId", "title", "description", "status", "publishedAt", "updatedAt") VALUES
      ('50000000-0000-4000-8000-000000000099', '10000000-0000-4000-8000-000000000091', '30000000-0000-4000-8000-000000000099', 'Mapped Home', '', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    ${ambiguous ? `INSERT INTO "ShortForm" ("id", "creatorId", "publicationId", "type", "description", "status", "publishedAt", "updatedAt") VALUES ('60000000-0000-4000-8000-000000000099', '10000000-0000-4000-8000-000000000091', '30000000-0000-4000-8000-000000000099', 'VIDEO', '', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);` : ''}
    INSERT INTO "PostLike" ("userId", "postId", "createdAt") VALUES
      ('10000000-0000-4000-8000-000000000092', '30000000-0000-4000-8000-000000000099', '2026-08-01T00:00:00Z'),
      ('10000000-0000-4000-8000-000000000092', '30000000-0000-4000-8000-000000000098', '2026-08-01T00:00:00Z');
    INSERT INTO "Comment" ("id", "authorId", "postId", "body", "createdAt", "updatedAt") VALUES
      ('91000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000092', '30000000-0000-4000-8000-000000000099', 'preserved comment', '2026-08-01T00:00:00Z', '2026-08-01T00:00:00Z');
    INSERT INTO "Report" ("id", "reporterId", "postId", "reason", "details", "status", "createdAt", "updatedAt") VALUES
      ('92000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000092', '30000000-0000-4000-8000-000000000099', 'SPAM', 'preserved report', 'REVIEWING', '2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z');
  `;
}

interface PgClient {
  connect(): Promise<void>;
  end(): Promise<void>;
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}
