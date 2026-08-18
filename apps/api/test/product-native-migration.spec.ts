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
const migrationName = '20260819006000_product_native_feed_playlist';
const adminUrl = process.env.DATABASE_URL;
const createdDatabases: string[] = [];

describe.skipIf(!adminUrl)('product-native Playlist SQL migration', () => {
  afterAll(async () => {
    for (const database of createdDatabases) await dropDatabase(database);
  });

  it('backfills every supported playable product and preserves ordering metadata', async () => {
    const client = await legacyDatabase();
    await client.query(mappedFixtureSql());
    await client.query(await migrationSql(migrationName));

    const items = await client.query<{
      type: string;
      productId: string;
      position: number;
      addedAt: string;
    }>(`
      SELECT "type"::text,
        COALESCE("homeVideoId", "seriesId", "seriesEpisodeId", "shortFormId", "communityPostId") AS "productId",
        "position", to_char("addedAt", 'YYYY-MM-DD HH24:MI:SS') AS "addedAt"
      FROM "PlaylistItem"
      ORDER BY "position"
    `);
    expect(
      items.rows.map(({ type, productId, position }) => ({
        type,
        productId,
        position,
      })),
    ).toEqual([
      { type: 'HOME_VIDEO', productId: ids.home, position: 1 },
      { type: 'SERIES', productId: ids.series, position: 2 },
      { type: 'SERIES_EPISODE', productId: ids.episode, position: 3 },
      { type: 'SHORTFORM', productId: ids.short, position: 4 },
      { type: 'COMMUNITY_POST', productId: ids.community, position: 5 },
    ]);
    expect(
      items.rows.every((item) => item.addedAt === '2026-08-01 00:00:00'),
    ).toBe(true);
    expect(
      (await client.query('SELECT 1 FROM "LegacyPlaylistItemResidual"'))
        .rowCount,
    ).toBe(0);
    expect(
      (
        await client.query(
          `SELECT to_char("publishedAt", 'YYYY-MM-DD HH24:MI:SS') AS "publishedAt" FROM "Series" WHERE "id" = '${ids.series}'`,
        )
      ).rows[0]?.publishedAt,
    ).toBe('2026-08-02 00:00:00');
    expect(
      (
        await client.query(
          `SELECT count(*)::int AS count FROM "Post" WHERE "id" = ANY($1::uuid[])`,
          [Object.values(ids.posts)],
        )
      ).rows[0]?.count,
    ).toBe(5);
    await client.end();
  });

  it('preserves unmapped and unsupported Playlist items plus legacy dependent rows', async () => {
    const client = await legacyDatabase();
    await client.query(residualFixtureSql());
    await client.query(await migrationSql(migrationName));

    expect(
      (
        await client.query(
          'SELECT "publicationId", "position", "reason" FROM "LegacyPlaylistItemResidual" ORDER BY "position"',
        )
      ).rows,
    ).toEqual([
      {
        publicationId: ids.residualPost,
        position: 1,
        reason: 'UNMAPPED_LEGACY_PUBLICATION',
      },
      {
        publicationId: ids.unsupportedPost,
        position: 2,
        reason: 'UNSUPPORTED_PLAYLIST_PRODUCT',
      },
    ]);
    expect((await client.query('SELECT 1 FROM "PlaylistItem"')).rowCount).toBe(
      0,
    );
    for (const table of [
      'PostLike',
      'PostSave',
      'Comment',
      'Report',
      'PostMedia',
    ]) {
      expect((await client.query(`SELECT 1 FROM "${table}"`)).rowCount).toBe(1);
    }
    await client.end();
  });

  it('aborts atomically with an explicit diagnostic for ambiguous Post mappings', async () => {
    const client = await legacyDatabase();
    await client.query(ambiguousFixtureSql());
    await expect(
      client.query(await migrationSql(migrationName)),
    ).rejects.toThrow(/Ambiguous legacy Post to Playlist product mapping/);
    expect(
      (
        await client.query(
          `SELECT to_regclass('public."LegacyPlaylistItemResidual"') AS name`,
        )
      ).rows[0]?.name,
    ).toBeNull();
    expect(
      (await client.query('SELECT count(*)::int AS count FROM "PlaylistItem"'))
        .rows[0]?.count,
    ).toBe(1);
    await client.end();
  });

  it('enforces typed identity, positive positions, uniqueness, and cross-Playlist reuse', async () => {
    const client = await legacyDatabase();
    await client.query(mappedFixtureSql());
    await client.query(await migrationSql(migrationName));
    await client.query(
      `INSERT INTO "Playlist" ("id", "ownerId", "title", "updatedAt") VALUES ('${ids.playlist2}', '${ids.owner}', 'Second', CURRENT_TIMESTAMP)`,
    );

    await expect(
      client.query(
        `INSERT INTO "PlaylistItem" ("playlistId", "type", "homeVideoId", "position") VALUES ('${ids.playlist}', 'SERIES', '${ids.home}', 6)`,
      ),
    ).rejects.toThrow();
    await expect(
      client.query(
        `INSERT INTO "PlaylistItem" ("playlistId", "type", "homeVideoId", "shortFormId", "position") VALUES ('${ids.playlist}', 'HOME_VIDEO', '${ids.home}', '${ids.short}', 6)`,
      ),
    ).rejects.toThrow();
    await expect(
      client.query(
        `INSERT INTO "PlaylistItem" ("playlistId", "type", "seriesEpisodeId", "position") VALUES ('${ids.playlist}', 'SERIES_EPISODE', '${ids.episode}', 6)`,
      ),
    ).rejects.toThrow();
    await expect(
      client.query(
        `INSERT INTO "PlaylistItem" ("playlistId", "type", "shortFormId", "position") VALUES ('${ids.playlist}', 'SHORTFORM', '${ids.short}', 0)`,
      ),
    ).rejects.toThrow();
    await expect(
      client.query(
        `INSERT INTO "PlaylistItem" ("playlistId", "type", "shortFormId", "position") VALUES ('${ids.playlist}', 'SHORTFORM', '${ids.short}', 1)`,
      ),
    ).rejects.toThrow();
    await expect(
      client.query(
        `INSERT INTO "PlaylistItem" ("playlistId", "type", "shortFormId", "position") VALUES ('${ids.playlist2}', 'SHORTFORM', '${ids.short}', 1)`,
      ),
    ).resolves.toMatchObject({ rowCount: 1 });
    await client.end();
  });
});

async function legacyDatabase() {
  const database = `miru_playlist_${Date.now()}_${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`;
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  await admin.end();
  createdDatabases.push(database);
  const url = new URL(adminUrl!);
  url.pathname = `/${database}`;
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  const names = (await readdir(migrationRoot))
    .filter((name) => name < migrationName)
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
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1',
    [database],
  );
  await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
  await admin.end();
}

const ids = {
  owner: '10000000-0000-4000-8000-000000000061',
  viewer: '10000000-0000-4000-8000-000000000062',
  playlist: '20000000-0000-4000-8000-000000000061',
  playlist2: '20000000-0000-4000-8000-000000000062',
  home: '50000000-0000-4000-8000-000000000061',
  series: '40000000-0000-4000-8000-000000000061',
  episode: '70000000-0000-4000-8000-000000000061',
  short: '60000000-0000-4000-8000-000000000061',
  community: '80000000-0000-4000-8000-000000000061',
  residualPost: '30000000-0000-4000-8000-000000000069',
  unsupportedPost: '30000000-0000-4000-8000-000000000068',
  posts: {
    home: '30000000-0000-4000-8000-000000000061',
    series: '30000000-0000-4000-8000-000000000062',
    episode: '30000000-0000-4000-8000-000000000063',
    short: '30000000-0000-4000-8000-000000000064',
    community: '30000000-0000-4000-8000-000000000065',
  },
};

function usersSql() {
  return `INSERT INTO "User" ("id", "email", "handle", "displayName", "updatedAt") VALUES
    ('${ids.owner}', 'owner@playlist.test', 'playlist_owner', 'Owner', CURRENT_TIMESTAMP),
    ('${ids.viewer}', 'viewer@playlist.test', 'playlist_viewer', 'Viewer', CURRENT_TIMESTAMP);`;
}

function mappedFixtureSql() {
  return `${usersSql()}
    INSERT INTO "Post" ("id", "authorId", "format", "status", "visibility", "publishedAt", "updatedAt") VALUES
      ('${ids.posts.home}', '${ids.owner}', 'LONG_VIDEO', 'PUBLISHED', 'PUBLIC', '2026-08-01T00:00:00Z', CURRENT_TIMESTAMP),
      ('${ids.posts.series}', '${ids.owner}', 'LONG_VIDEO', 'PUBLISHED', 'PUBLIC', '2026-08-02T00:00:00Z', CURRENT_TIMESTAMP),
      ('${ids.posts.episode}', '${ids.owner}', 'LONG_VIDEO', 'PUBLISHED', 'PUBLIC', '2026-08-03T00:00:00Z', CURRENT_TIMESTAMP),
      ('${ids.posts.short}', '${ids.owner}', 'SHORT_VIDEO', 'PUBLISHED', 'PUBLIC', '2026-08-04T00:00:00Z', CURRENT_TIMESTAMP),
      ('${ids.posts.community}', '${ids.owner}', 'COMMUNITY_VIDEO', 'PUBLISHED', 'PUBLIC', '2026-08-05T00:00:00Z', CURRENT_TIMESTAMP);
    INSERT INTO "Series" ("id", "creatorId", "title", "workType", "publicationStatus", "singleWorkPublicationId", "updatedAt") VALUES
      ('${ids.series}', '${ids.owner}', 'Series', 'SINGLE_WORK', 'PUBLISHED', '${ids.posts.series}', CURRENT_TIMESTAMP);
    INSERT INTO "HomeVideo" ("id", "creatorId", "publicationId", "title", "status", "publishedAt", "updatedAt") VALUES
      ('${ids.home}', '${ids.owner}', '${ids.posts.home}', 'Home', 'PUBLISHED', '2026-08-01T00:00:00Z', CURRENT_TIMESTAMP);
    INSERT INTO "SeriesEpisode" ("id", "seriesId", "publicationId", "episodeNumber", "title", "publishedAt", "updatedAt") VALUES
      ('${ids.episode}', '${ids.series}', '${ids.posts.episode}', 1, 'Episode', '2026-08-03T00:00:00Z', CURRENT_TIMESTAMP);
    INSERT INTO "ShortForm" ("id", "creatorId", "publicationId", "type", "status", "publishedAt", "updatedAt") VALUES
      ('${ids.short}', '${ids.owner}', '${ids.posts.short}', 'VIDEO', 'PUBLISHED', '2026-08-04T00:00:00Z', CURRENT_TIMESTAMP);
    INSERT INTO "CommunityPost" ("id", "authorId", "publicationId", "type", "status", "publishedAt", "updatedAt") VALUES
      ('${ids.community}', '${ids.owner}', '${ids.posts.community}', 'VIDEO', 'PUBLISHED', '2026-08-05T00:00:00Z', CURRENT_TIMESTAMP);
    INSERT INTO "Playlist" ("id", "ownerId", "title", "updatedAt") VALUES ('${ids.playlist}', '${ids.viewer}', 'Mapped', CURRENT_TIMESTAMP);
    INSERT INTO "PlaylistItem" ("playlistId", "publicationId", "position", "addedAt") VALUES
      ('${ids.playlist}', '${ids.posts.home}', 1, '2026-08-01T00:00:00Z'),
      ('${ids.playlist}', '${ids.posts.series}', 2, '2026-08-01T00:00:00Z'),
      ('${ids.playlist}', '${ids.posts.episode}', 3, '2026-08-01T00:00:00Z'),
      ('${ids.playlist}', '${ids.posts.short}', 4, '2026-08-01T00:00:00Z'),
      ('${ids.playlist}', '${ids.posts.community}', 5, '2026-08-01T00:00:00Z');`;
}

function residualFixtureSql() {
  return `${usersSql()}
    INSERT INTO "MediaAsset" ("id", "ownerId", "kind", "purpose", "status", "sourceKey", "updatedAt") VALUES
      ('90000000-0000-4000-8000-000000000061', '${ids.owner}', 'IMAGE', 'POST_IMAGE', 'READY', 'migration/residual', CURRENT_TIMESTAMP);
    INSERT INTO "Post" ("id", "authorId", "format", "status", "visibility", "updatedAt") VALUES
      ('${ids.residualPost}', '${ids.owner}', 'IMAGE', 'PUBLISHED', 'PUBLIC', CURRENT_TIMESTAMP),
      ('${ids.unsupportedPost}', '${ids.owner}', 'COMMUNITY_TEXT', 'PUBLISHED', 'PUBLIC', CURRENT_TIMESTAMP);
    INSERT INTO "CommunityPost" ("id", "authorId", "publicationId", "type", "status", "updatedAt") VALUES
      ('${ids.community}', '${ids.owner}', '${ids.unsupportedPost}', 'TEXT', 'PUBLISHED', CURRENT_TIMESTAMP);
    INSERT INTO "Playlist" ("id", "ownerId", "title", "updatedAt") VALUES ('${ids.playlist}', '${ids.viewer}', 'Residual', CURRENT_TIMESTAMP);
    INSERT INTO "PlaylistItem" ("playlistId", "publicationId", "position") VALUES
      ('${ids.playlist}', '${ids.residualPost}', 1), ('${ids.playlist}', '${ids.unsupportedPost}', 2);
    INSERT INTO "PostLike" ("userId", "postId") VALUES ('${ids.viewer}', '${ids.residualPost}');
    INSERT INTO "PostSave" ("userId", "postId") VALUES ('${ids.viewer}', '${ids.residualPost}');
    INSERT INTO "Comment" ("id", "authorId", "postId", "body", "updatedAt") VALUES ('91000000-0000-4000-8000-000000000061', '${ids.viewer}', '${ids.residualPost}', 'residual', CURRENT_TIMESTAMP);
    INSERT INTO "Report" ("id", "reporterId", "postId", "reason", "updatedAt") VALUES ('92000000-0000-4000-8000-000000000061', '${ids.viewer}', '${ids.residualPost}', 'OTHER', CURRENT_TIMESTAMP);
    INSERT INTO "PostMedia" ("postId", "assetId", "order") VALUES ('${ids.residualPost}', '90000000-0000-4000-8000-000000000061', 0);`;
}

function ambiguousFixtureSql() {
  return `${usersSql()}
    INSERT INTO "Post" ("id", "authorId", "format", "status", "visibility", "updatedAt") VALUES ('${ids.posts.home}', '${ids.owner}', 'LONG_VIDEO', 'PUBLISHED', 'PUBLIC', CURRENT_TIMESTAMP);
    INSERT INTO "HomeVideo" ("id", "creatorId", "publicationId", "title", "status", "updatedAt") VALUES ('${ids.home}', '${ids.owner}', '${ids.posts.home}', 'Home', 'PUBLISHED', CURRENT_TIMESTAMP);
    INSERT INTO "ShortForm" ("id", "creatorId", "publicationId", "type", "status", "updatedAt") VALUES ('${ids.short}', '${ids.owner}', '${ids.posts.home}', 'VIDEO', 'PUBLISHED', CURRENT_TIMESTAMP);
    INSERT INTO "Playlist" ("id", "ownerId", "title", "updatedAt") VALUES ('${ids.playlist}', '${ids.viewer}', 'Ambiguous', CURRENT_TIMESTAMP);
    INSERT INTO "PlaylistItem" ("playlistId", "publicationId", "position") VALUES ('${ids.playlist}', '${ids.posts.home}', 1);`;
}

interface PgClient {
  connect(): Promise<void>;
  end(): Promise<void>;
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}
