-- Native product engagement remains deliberately separate from product content.
-- Legacy interaction tables are retained for genuinely unmapped legacy Posts.
CREATE TYPE "EngagementTargetType" AS ENUM (
  'HOME_VIDEO', 'SERIES', 'SERIES_EPISODE', 'SHORTFORM', 'COMMUNITY_POST'
);
CREATE TYPE "ModerationTargetStatus" AS ENUM ('ACTIVE', 'REMOVED');
CREATE TYPE "ModerationAuditAction" AS ENUM (
  'REVIEW_STARTED', 'REPORT_DISMISSED', 'CONTENT_REMOVED'
);

CREATE TABLE "EngagementTarget" (
  "id" UUID NOT NULL,
  "type" "EngagementTargetType" NOT NULL,
  "homeVideoId" UUID,
  "seriesId" UUID,
  "seriesEpisodeId" UUID,
  "shortFormId" UUID,
  "communityPostId" UUID,
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "commentCount" INTEGER NOT NULL DEFAULT 0,
  "moderationStatus" "ModerationTargetStatus" NOT NULL DEFAULT 'ACTIVE',
  "removedAt" TIMESTAMP(3),
  "removedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EngagementTarget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EngagementTarget_one_product_check" CHECK (
    num_nonnulls("homeVideoId", "seriesId", "seriesEpisodeId", "shortFormId", "communityPostId") = 1
  ),
  CONSTRAINT "EngagementTarget_type_product_check" CHECK (
    ("type" = 'HOME_VIDEO' AND "homeVideoId" IS NOT NULL) OR
    ("type" = 'SERIES' AND "seriesId" IS NOT NULL) OR
    ("type" = 'SERIES_EPISODE' AND "seriesEpisodeId" IS NOT NULL) OR
    ("type" = 'SHORTFORM' AND "shortFormId" IS NOT NULL) OR
    ("type" = 'COMMUNITY_POST' AND "communityPostId" IS NOT NULL)
  ),
  CONSTRAINT "EngagementTarget_count_check" CHECK ("likeCount" >= 0 AND "commentCount" >= 0),
  CONSTRAINT "EngagementTarget_removal_metadata_check" CHECK (
    ("moderationStatus" = 'ACTIVE' AND "removedAt" IS NULL) OR
    ("moderationStatus" = 'REMOVED' AND "removedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "EngagementTarget_homeVideoId_key" ON "EngagementTarget"("homeVideoId");
CREATE UNIQUE INDEX "EngagementTarget_seriesId_key" ON "EngagementTarget"("seriesId");
CREATE UNIQUE INDEX "EngagementTarget_seriesEpisodeId_key" ON "EngagementTarget"("seriesEpisodeId");
CREATE UNIQUE INDEX "EngagementTarget_shortFormId_key" ON "EngagementTarget"("shortFormId");
CREATE UNIQUE INDEX "EngagementTarget_communityPostId_key" ON "EngagementTarget"("communityPostId");
CREATE INDEX "EngagementTarget_type_moderationStatus_idx" ON "EngagementTarget"("type", "moderationStatus");

ALTER TABLE "EngagementTarget" ADD CONSTRAINT "EngagementTarget_homeVideoId_fkey" FOREIGN KEY ("homeVideoId") REFERENCES "HomeVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementTarget" ADD CONSTRAINT "EngagementTarget_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementTarget" ADD CONSTRAINT "EngagementTarget_seriesEpisodeId_fkey" FOREIGN KEY ("seriesEpisodeId") REFERENCES "SeriesEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementTarget" ADD CONSTRAINT "EngagementTarget_shortFormId_fkey" FOREIGN KEY ("shortFormId") REFERENCES "ShortForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementTarget" ADD CONSTRAINT "EngagementTarget_communityPostId_fkey" FOREIGN KEY ("communityPostId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementTarget" ADD CONSTRAINT "EngagementTarget_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EngagementLike" (
  "userId" UUID NOT NULL,
  "targetId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EngagementLike_pkey" PRIMARY KEY ("userId", "targetId")
);
CREATE INDEX "EngagementLike_targetId_createdAt_idx" ON "EngagementLike"("targetId", "createdAt");
ALTER TABLE "EngagementLike" ADD CONSTRAINT "EngagementLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementLike" ADD CONSTRAINT "EngagementLike_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "EngagementTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EngagementSave" (
  "userId" UUID NOT NULL,
  "targetId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EngagementSave_pkey" PRIMARY KEY ("userId", "targetId")
);
CREATE INDEX "EngagementSave_targetId_createdAt_idx" ON "EngagementSave"("targetId", "createdAt");
ALTER TABLE "EngagementSave" ADD CONSTRAINT "EngagementSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementSave" ADD CONSTRAINT "EngagementSave_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "EngagementTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EngagementComment" (
  "id" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "targetId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EngagementComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EngagementComment_targetId_createdAt_id_idx" ON "EngagementComment"("targetId", "createdAt" DESC, "id" DESC);
CREATE INDEX "EngagementComment_authorId_createdAt_idx" ON "EngagementComment"("authorId", "createdAt" DESC);
ALTER TABLE "EngagementComment" ADD CONSTRAINT "EngagementComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementComment" ADD CONSTRAINT "EngagementComment_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "EngagementTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EngagementReport" (
  "id" UUID NOT NULL,
  "reporterId" UUID NOT NULL,
  "targetId" UUID NOT NULL,
  "reason" "ReportReason" NOT NULL,
  "details" TEXT NOT NULL DEFAULT '',
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EngagementReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EngagementReport_reporterId_targetId_key" ON "EngagementReport"("reporterId", "targetId");
CREATE INDEX "EngagementReport_status_createdAt_id_idx" ON "EngagementReport"("status", "createdAt", "id");
CREATE INDEX "EngagementReport_targetId_createdAt_idx" ON "EngagementReport"("targetId", "createdAt");
ALTER TABLE "EngagementReport" ADD CONSTRAINT "EngagementReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementReport" ADD CONSTRAINT "EngagementReport_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "EngagementTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ModerationAuditLog" (
  "id" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "reportId" UUID,
  "targetId" UUID NOT NULL,
  "action" "ModerationAuditAction" NOT NULL,
  "previousStatus" "ReportStatus",
  "resultingStatus" "ReportStatus",
  "note" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ModerationAuditLog_reportId_createdAt_id_idx" ON "ModerationAuditLog"("reportId", "createdAt", "id");
CREATE INDEX "ModerationAuditLog_targetId_createdAt_id_idx" ON "ModerationAuditLog"("targetId", "createdAt", "id");
ALTER TABLE "ModerationAuditLog" ADD CONSTRAINT "ModerationAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModerationAuditLog" ADD CONSTRAINT "ModerationAuditLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "EngagementReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationAuditLog" ADD CONSTRAINT "ModerationAuditLog_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "EngagementTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A compatibility Post may not identify two product targets. Guessing would
-- merge unrelated engagement, so abort before copying any interaction rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT "publicationId"
    FROM (
      SELECT "publicationId" FROM "HomeVideo"
      UNION ALL SELECT "singleWorkPublicationId" FROM "Series" WHERE "singleWorkPublicationId" IS NOT NULL
      UNION ALL SELECT "publicationId" FROM "SeriesEpisode"
      UNION ALL SELECT "publicationId" FROM "ShortForm"
      UNION ALL SELECT "publicationId" FROM "CommunityPost"
    ) mappings
    GROUP BY "publicationId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Ambiguous legacy Post to product engagement mapping detected';
  END IF;
END $$;

INSERT INTO "EngagementTarget" ("id", "type", "homeVideoId", "updatedAt")
SELECT gen_random_uuid(), 'HOME_VIDEO', "id", CURRENT_TIMESTAMP FROM "HomeVideo";
INSERT INTO "EngagementTarget" ("id", "type", "seriesId", "updatedAt")
SELECT gen_random_uuid(), 'SERIES', "id", CURRENT_TIMESTAMP FROM "Series";
INSERT INTO "EngagementTarget" ("id", "type", "seriesEpisodeId", "updatedAt")
SELECT gen_random_uuid(), 'SERIES_EPISODE', "id", CURRENT_TIMESTAMP FROM "SeriesEpisode";
INSERT INTO "EngagementTarget" ("id", "type", "shortFormId", "updatedAt")
SELECT gen_random_uuid(), 'SHORTFORM', "id", CURRENT_TIMESTAMP FROM "ShortForm";
INSERT INTO "EngagementTarget" ("id", "type", "communityPostId", "updatedAt")
SELECT gen_random_uuid(), 'COMMUNITY_POST', "id", CURRENT_TIMESTAMP FROM "CommunityPost";

CREATE TEMP TABLE "_NativeEngagementMap" (
  "publicationId" UUID PRIMARY KEY,
  "targetId" UUID NOT NULL
) ON COMMIT DROP;
INSERT INTO "_NativeEngagementMap"
SELECT h."publicationId", t."id" FROM "HomeVideo" h JOIN "EngagementTarget" t ON t."homeVideoId" = h."id"
UNION ALL
SELECT s."singleWorkPublicationId", t."id" FROM "Series" s JOIN "EngagementTarget" t ON t."seriesId" = s."id" WHERE s."singleWorkPublicationId" IS NOT NULL
UNION ALL
SELECT e."publicationId", t."id" FROM "SeriesEpisode" e JOIN "EngagementTarget" t ON t."seriesEpisodeId" = e."id"
UNION ALL
SELECT f."publicationId", t."id" FROM "ShortForm" f JOIN "EngagementTarget" t ON t."shortFormId" = f."id"
UNION ALL
SELECT c."publicationId", t."id" FROM "CommunityPost" c JOIN "EngagementTarget" t ON t."communityPostId" = c."id";

INSERT INTO "EngagementLike" ("userId", "targetId", "createdAt")
SELECT l."userId", m."targetId", l."createdAt" FROM "PostLike" l JOIN "_NativeEngagementMap" m ON m."publicationId" = l."postId";
INSERT INTO "EngagementSave" ("userId", "targetId", "createdAt")
SELECT s."userId", m."targetId", s."createdAt" FROM "PostSave" s JOIN "_NativeEngagementMap" m ON m."publicationId" = s."postId";
INSERT INTO "EngagementComment" ("id", "authorId", "targetId", "body", "createdAt", "updatedAt")
SELECT c."id", c."authorId", m."targetId", c."body", c."createdAt", c."updatedAt" FROM "Comment" c JOIN "_NativeEngagementMap" m ON m."publicationId" = c."postId";
INSERT INTO "EngagementReport" ("id", "reporterId", "targetId", "reason", "details", "status", "createdAt", "updatedAt")
SELECT r."id", r."reporterId", m."targetId", r."reason", r."details", r."status", r."createdAt", r."updatedAt" FROM "Report" r JOIN "_NativeEngagementMap" m ON m."publicationId" = r."postId";

UPDATE "EngagementTarget" t SET
  "likeCount" = (SELECT COUNT(*)::INTEGER FROM "EngagementLike" l WHERE l."targetId" = t."id"),
  "commentCount" = (SELECT COUNT(*)::INTEGER FROM "EngagementComment" c WHERE c."targetId" = t."id"),
  "updatedAt" = CURRENT_TIMESTAMP;

-- Exact row-count assertions prevent a partially copied mapped subset. Rows on
-- genuinely unmapped legacy Posts intentionally remain in legacy tables.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "EngagementLike") <> (SELECT COUNT(*) FROM "PostLike" l JOIN "_NativeEngagementMap" m ON m."publicationId" = l."postId") OR
     (SELECT COUNT(*) FROM "EngagementSave") <> (SELECT COUNT(*) FROM "PostSave" s JOIN "_NativeEngagementMap" m ON m."publicationId" = s."postId") OR
     (SELECT COUNT(*) FROM "EngagementComment") <> (SELECT COUNT(*) FROM "Comment" c JOIN "_NativeEngagementMap" m ON m."publicationId" = c."postId") OR
     (SELECT COUNT(*) FROM "EngagementReport") <> (SELECT COUNT(*) FROM "Report" r JOIN "_NativeEngagementMap" m ON m."publicationId" = r."postId") THEN
    RAISE EXCEPTION 'Native engagement backfill row-count validation failed';
  END IF;
END $$;
