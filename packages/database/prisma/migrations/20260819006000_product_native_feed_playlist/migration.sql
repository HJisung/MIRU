CREATE TYPE "PlaylistTargetType" AS ENUM ('HOME_VIDEO', 'SERIES', 'SERIES_EPISODE', 'SHORTFORM', 'COMMUNITY_POST');

ALTER TABLE "Series" ADD COLUMN "publishedAt" TIMESTAMP(3);
UPDATE "Series" s
SET "publishedAt" = COALESCE(p."publishedAt", s."updatedAt")
FROM "Post" p
WHERE s."singleWorkPublicationId" = p."id"
  AND s."workType" = 'SINGLE_WORK'
  AND s."publicationStatus" = 'PUBLISHED';

ALTER TABLE "HomeVideo" ALTER COLUMN "publicationId" DROP NOT NULL;
ALTER TABLE "SeriesEpisode" ALTER COLUMN "publicationId" DROP NOT NULL;
ALTER TABLE "ShortForm" ALTER COLUMN "publicationId" DROP NOT NULL;
ALTER TABLE "CommunityPost" ALTER COLUMN "publicationId" DROP NOT NULL;

ALTER TABLE "HomeVideo" DROP CONSTRAINT "HomeVideo_publicationId_fkey";
ALTER TABLE "SeriesEpisode" DROP CONSTRAINT "SeriesEpisode_publicationId_fkey";
ALTER TABLE "ShortForm" DROP CONSTRAINT "ShortForm_publicationId_fkey";
ALTER TABLE "CommunityPost" DROP CONSTRAINT "CommunityPost_publicationId_fkey";
ALTER TABLE "HomeVideo" ADD CONSTRAINT "HomeVideo_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SeriesEpisode" ADD CONSTRAINT "SeriesEpisode_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShortForm" ADD CONSTRAINT "ShortForm_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TEMP TABLE "_PlaylistProductMap" AS
SELECT h."publicationId", 'HOME_VIDEO'::"PlaylistTargetType" AS type,
       h.id AS "homeVideoId", NULL::uuid AS "seriesId", NULL::uuid AS "seriesEpisodeId",
       NULL::uuid AS "shortFormId", NULL::uuid AS "communityPostId", TRUE AS supported
FROM "HomeVideo" h WHERE h."publicationId" IS NOT NULL
UNION ALL
SELECT s."singleWorkPublicationId", 'SERIES'::"PlaylistTargetType", NULL, s.id, NULL, NULL, NULL,
       s."workType" = 'SINGLE_WORK'
FROM "Series" s WHERE s."singleWorkPublicationId" IS NOT NULL
UNION ALL
SELECT e."publicationId", 'SERIES_EPISODE'::"PlaylistTargetType", NULL, NULL, e.id, NULL, NULL, TRUE
FROM "SeriesEpisode" e WHERE e."publicationId" IS NOT NULL
UNION ALL
SELECT sf."publicationId", 'SHORTFORM'::"PlaylistTargetType", NULL, NULL, NULL, sf.id, NULL,
       sf.type = 'VIDEO'
FROM "ShortForm" sf WHERE sf."publicationId" IS NOT NULL
UNION ALL
SELECT cp."publicationId", 'COMMUNITY_POST'::"PlaylistTargetType", NULL, NULL, NULL, NULL, cp.id,
       cp.type = 'VIDEO'
FROM "CommunityPost" cp WHERE cp."publicationId" IS NOT NULL;

DO $$
DECLARE details text;
BEGIN
  SELECT string_agg(format('%s (%s mappings)', "publicationId", count), ', ' ORDER BY "publicationId")
  INTO details
  FROM (SELECT "publicationId", count(*) FROM "_PlaylistProductMap" GROUP BY "publicationId" HAVING count(*) > 1) ambiguous;
  IF details IS NOT NULL THEN
    RAISE EXCEPTION 'Ambiguous legacy Post to Playlist product mapping: %', details;
  END IF;
END $$;

ALTER TABLE "PlaylistItem" RENAME TO "_LegacyPlaylistItemSource";
ALTER TABLE "_LegacyPlaylistItemSource" RENAME CONSTRAINT "PlaylistItem_pkey" TO "_LegacyPlaylistItemSource_pkey";
ALTER TABLE "_LegacyPlaylistItemSource" RENAME CONSTRAINT "PlaylistItem_playlistId_fkey" TO "_LegacyPlaylistItemSource_playlistId_fkey";
ALTER TABLE "_LegacyPlaylistItemSource" RENAME CONSTRAINT "PlaylistItem_publicationId_fkey" TO "_LegacyPlaylistItemSource_publicationId_fkey";

CREATE TABLE "PlaylistItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "playlistId" UUID NOT NULL,
  "type" "PlaylistTargetType" NOT NULL,
  "homeVideoId" UUID,
  "seriesId" UUID,
  "seriesEpisodeId" UUID,
  "shortFormId" UUID,
  "communityPostId" UUID,
  "position" INTEGER NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaylistItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlaylistItem_positive_position" CHECK ("position" > 0),
  CONSTRAINT "PlaylistItem_exactly_one_product" CHECK (num_nonnulls("homeVideoId", "seriesId", "seriesEpisodeId", "shortFormId", "communityPostId") = 1),
  CONSTRAINT "PlaylistItem_type_product_match" CHECK (
    ("type" = 'HOME_VIDEO' AND "homeVideoId" IS NOT NULL) OR
    ("type" = 'SERIES' AND "seriesId" IS NOT NULL) OR
    ("type" = 'SERIES_EPISODE' AND "seriesEpisodeId" IS NOT NULL) OR
    ("type" = 'SHORTFORM' AND "shortFormId" IS NOT NULL) OR
    ("type" = 'COMMUNITY_POST' AND "communityPostId" IS NOT NULL)
  )
);

CREATE TABLE "LegacyPlaylistItemResidual" (
  "playlistId" UUID NOT NULL,
  "publicationId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegacyPlaylistItemResidual_pkey" PRIMARY KEY ("playlistId", "publicationId")
);

DO $$
DECLARE details text;
BEGIN
  SELECT string_agg(format('%s/%s', duplicate."playlistId", duplicate.type), ', ')
  INTO details
  FROM (
    SELECT source."playlistId", map.type
    FROM "_LegacyPlaylistItemSource" source
    JOIN "_PlaylistProductMap" map USING ("publicationId")
    WHERE map.supported
    GROUP BY source."playlistId", map.type,
             map."homeVideoId", map."seriesId", map."seriesEpisodeId", map."shortFormId", map."communityPostId"
    HAVING count(*) > 1
  ) duplicate;
  IF details IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate typed Playlist mapping: %', details;
  END IF;
END $$;

INSERT INTO "PlaylistItem" ("playlistId", type, "homeVideoId", "seriesId", "seriesEpisodeId", "shortFormId", "communityPostId", position, "addedAt")
SELECT source."playlistId", map.type, map."homeVideoId", map."seriesId", map."seriesEpisodeId", map."shortFormId", map."communityPostId", source.position, source."addedAt"
FROM "_LegacyPlaylistItemSource" source
JOIN "_PlaylistProductMap" map USING ("publicationId")
WHERE map.supported;

INSERT INTO "LegacyPlaylistItemResidual" ("playlistId", "publicationId", position, reason, "addedAt")
SELECT source."playlistId", source."publicationId", source.position,
       CASE WHEN map."publicationId" IS NULL THEN 'UNMAPPED_LEGACY_PUBLICATION' ELSE 'UNSUPPORTED_PLAYLIST_PRODUCT' END,
       source."addedAt"
FROM "_LegacyPlaylistItemSource" source
LEFT JOIN "_PlaylistProductMap" map USING ("publicationId")
WHERE map."publicationId" IS NULL OR NOT map.supported;

DO $$
DECLARE source_count bigint; migrated_count bigint;
BEGIN
  SELECT count(*) INTO source_count FROM "_LegacyPlaylistItemSource";
  SELECT (SELECT count(*) FROM "PlaylistItem") + (SELECT count(*) FROM "LegacyPlaylistItemResidual") INTO migrated_count;
  IF source_count <> migrated_count THEN
    RAISE EXCEPTION 'Playlist migration row-count mismatch: source %, preserved %', source_count, migrated_count;
  END IF;
END $$;

DROP TABLE "_LegacyPlaylistItemSource";

CREATE UNIQUE INDEX "PlaylistItem_playlistId_position_key" ON "PlaylistItem"("playlistId", "position");
CREATE UNIQUE INDEX "PlaylistItem_playlistId_homeVideoId_key" ON "PlaylistItem"("playlistId", "homeVideoId");
CREATE UNIQUE INDEX "PlaylistItem_playlistId_seriesId_key" ON "PlaylistItem"("playlistId", "seriesId");
CREATE UNIQUE INDEX "PlaylistItem_playlistId_seriesEpisodeId_key" ON "PlaylistItem"("playlistId", "seriesEpisodeId");
CREATE UNIQUE INDEX "PlaylistItem_playlistId_shortFormId_key" ON "PlaylistItem"("playlistId", "shortFormId");
CREATE UNIQUE INDEX "PlaylistItem_playlistId_communityPostId_key" ON "PlaylistItem"("playlistId", "communityPostId");
CREATE INDEX "PlaylistItem_playlistId_position_idx" ON "PlaylistItem"("playlistId", "position");
CREATE INDEX "LegacyPlaylistItemResidual_publicationId_idx" ON "LegacyPlaylistItemResidual"("publicationId");
CREATE INDEX "Playlist_visibility_updatedAt_id_idx" ON "Playlist"("visibility", "updatedAt" DESC, "id" DESC);
CREATE INDEX "Series_publicationStatus_workType_publishedAt_id_idx" ON "Series"("publicationStatus", "workType", "publishedAt" DESC, "id" DESC);
CREATE INDEX "SeriesEpisode_publishedAt_id_idx" ON "SeriesEpisode"("publishedAt" DESC, "id" DESC);
DROP INDEX "Series_publicationStatus_releaseDate_idx";

ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_homeVideoId_fkey" FOREIGN KEY ("homeVideoId") REFERENCES "HomeVideo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_seriesEpisodeId_fkey" FOREIGN KEY ("seriesEpisodeId") REFERENCES "SeriesEpisode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_shortFormId_fkey" FOREIGN KEY ("shortFormId") REFERENCES "ShortForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_communityPostId_fkey" FOREIGN KEY ("communityPostId") REFERENCES "CommunityPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegacyPlaylistItemResidual" ADD CONSTRAINT "LegacyPlaylistItemResidual_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegacyPlaylistItemResidual" ADD CONSTRAINT "LegacyPlaylistItemResidual_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
