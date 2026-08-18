import { config } from 'dotenv';
import pg from 'pg';
import { resolve } from 'node:path';

config({ path: resolve(import.meta.dirname, '../../../.env'), quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const client = new pg.Client({ connectionString });

const mappingCte = `
  WITH product_map AS (
    SELECT "publicationId", 'HOME_VIDEO' AS type FROM "HomeVideo" WHERE "publicationId" IS NOT NULL
    UNION ALL SELECT "singleWorkPublicationId", 'SERIES' FROM "Series" WHERE "singleWorkPublicationId" IS NOT NULL
    UNION ALL SELECT "publicationId", 'SERIES_EPISODE' FROM "SeriesEpisode" WHERE "publicationId" IS NOT NULL
    UNION ALL SELECT "publicationId", 'SHORTFORM' FROM "ShortForm" WHERE "publicationId" IS NOT NULL
    UNION ALL SELECT "publicationId", 'COMMUNITY_POST' FROM "CommunityPost" WHERE "publicationId" IS NOT NULL
  ), mapping AS (
    SELECT "publicationId", count(*)::int AS "mappingCount", array_agg(type ORDER BY type) AS types
    FROM product_map GROUP BY "publicationId"
  ), unmapped AS (
    SELECT p."id", p."createdAt" FROM "Post" p LEFT JOIN mapping m ON m."publicationId" = p."id"
    WHERE m."publicationId" IS NULL
  )
`;

interface AuditRow {
  category: string;
  count: string;
  oldest: Date | null;
  newest: Date | null;
}

async function main() {
  await client.connect();
  await client.query('BEGIN TRANSACTION READ ONLY');
  try {
    const rows = await client.query<AuditRow>(`${mappingCte}
      SELECT 'Post' AS category, count(*)::text AS count, min("createdAt") AS oldest, max("createdAt") AS newest FROM unmapped
      UNION ALL SELECT 'PostLike', count(*)::text, min(x."createdAt"), max(x."createdAt") FROM "PostLike" x JOIN unmapped u ON u.id = x."postId"
      UNION ALL SELECT 'PostSave', count(*)::text, min(x."createdAt"), max(x."createdAt") FROM "PostSave" x JOIN unmapped u ON u.id = x."postId"
      UNION ALL SELECT 'Comment', count(*)::text, min(x."createdAt"), max(x."createdAt") FROM "Comment" x JOIN unmapped u ON u.id = x."postId"
      UNION ALL SELECT 'Report', count(*)::text, min(x."createdAt"), max(x."createdAt") FROM "Report" x JOIN unmapped u ON u.id = x."postId"
      UNION ALL SELECT 'PostMedia', count(*)::text, NULL, NULL FROM "PostMedia" x JOIN unmapped u ON u.id = x."postId"
      ORDER BY category
    `);
    const ambiguous = await client.query<{ publicationId: string; mappingCount: number; types: string[] }>(`${mappingCte}
      SELECT "publicationId", "mappingCount", types FROM mapping WHERE "mappingCount" > 1 ORDER BY "publicationId"
    `);
    const samples = await client.query<{ id: string; createdAt: Date }>(`${mappingCte}
      SELECT id, "createdAt" FROM unmapped ORDER BY "createdAt", id LIMIT 100
    `);
    const residualExists = (
      await client.query<{ name: string | null }>(
        `SELECT to_regclass('public."LegacyPlaylistItemResidual"')::text AS name`,
      )
    ).rows[0]?.name;
    const playlistResidual = residualExists
      ? await client.query<{
          reason: string;
          count: string;
          oldest: Date | null;
          newest: Date | null;
        }>(`
          SELECT reason, count(*)::text AS count, min("addedAt") AS oldest, max("addedAt") AS newest
          FROM "LegacyPlaylistItemResidual" GROUP BY reason ORDER BY reason
        `)
      : { rows: [] };

    const report = {
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY',
      unmapped: Object.fromEntries(
        rows.rows.map((row) => [
          row.category,
          {
            count: Number(row.count),
            oldest: row.oldest?.toISOString() ?? null,
            newest: row.newest?.toISOString() ?? null,
          },
        ]),
      ),
      ambiguousMappings: ambiguous.rows,
      residualPlaylistItems: playlistResidual.rows.map((row) => ({
        reason: row.reason,
        count: Number(row.count),
        oldest: row.oldest?.toISOString() ?? null,
        newest: row.newest?.toISOString() ?? null,
      })),
      unmappedPostSamples: samples.rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
      })),
      sampleLimit: 100,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

await main();
