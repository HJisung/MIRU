-- CreateEnum
CREATE TYPE "DomainPublicationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'UNLISTED', 'ARCHIVED', 'REMOVED');

-- CreateEnum
CREATE TYPE "SeriesWorkType" AS ENUM ('SINGLE_WORK', 'EPISODIC');

-- CreateEnum
CREATE TYPE "SeriesSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ShortFormType" AS ENUM ('VIDEO', 'IMAGE_CAROUSEL');

-- CreateEnum
CREATE TYPE "CommunityPostType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'LINK');

-- CreateEnum
CREATE TYPE "PlaylistVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- AlterTable
ALTER TABLE "Series" ADD COLUMN     "ageRating" TEXT,
ADD COLUMN     "backdropAssetId" UUID,
ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "posterAssetId" UUID,
ADD COLUMN     "productionInfo" JSONB,
ADD COLUMN     "publicationStatus" "DomainPublicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "releaseDate" TIMESTAMP(3),
ADD COLUMN     "singleWorkPublicationId" UUID,
ADD COLUMN     "synopsis" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "workType" "SeriesWorkType" NOT NULL DEFAULT 'EPISODIC';

-- CreateTable
CREATE TABLE "HomeVideo" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "DomainPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "coverAssetId" UUID,
    "status" "DomainPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "collectionId" UUID NOT NULL,
    "homeVideoId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("collectionId","homeVideoId")
);

-- CreateTable
CREATE TABLE "SeriesSeason" (
    "id" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeriesSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeriesEpisode" (
    "id" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "seasonId" UUID,
    "publicationId" UUID NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "seasonEpisodeNumber" INTEGER,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeriesEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeriesSubmission" (
    "id" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "applicantId" UUID NOT NULL,
    "status" "SeriesSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeriesSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortForm" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "type" "ShortFormType" NOT NULL,
    "title" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "musicKey" TEXT,
    "promotedHomeVideoId" UUID,
    "promotedSeriesId" UUID,
    "promotedEpisodeId" UUID,
    "status" "DomainPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityCategory" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "categoryId" UUID,
    "type" "CommunityPostType" NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "linkUrl" TEXT,
    "status" "DomainPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playlist" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "visibility" "PlaylistVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistItem" (
    "playlistId" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistItem_pkey" PRIMARY KEY ("playlistId","publicationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeVideo_publicationId_key" ON "HomeVideo"("publicationId");

-- CreateIndex
CREATE INDEX "HomeVideo_status_publishedAt_id_idx" ON "HomeVideo"("status", "publishedAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "HomeVideo_creatorId_createdAt_idx" ON "HomeVideo"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Collection_ownerId_createdAt_idx" ON "Collection"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Collection_status_publishedAt_idx" ON "Collection"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "CollectionItem_homeVideoId_idx" ON "CollectionItem"("homeVideoId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_collectionId_position_key" ON "CollectionItem"("collectionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "SeriesSeason_seriesId_seasonNumber_key" ON "SeriesSeason"("seriesId", "seasonNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SeriesEpisode_publicationId_key" ON "SeriesEpisode"("publicationId");

-- CreateIndex
CREATE INDEX "SeriesEpisode_seasonId_seasonEpisodeNumber_idx" ON "SeriesEpisode"("seasonId", "seasonEpisodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SeriesEpisode_seriesId_episodeNumber_key" ON "SeriesEpisode"("seriesId", "episodeNumber");

-- CreateIndex
CREATE INDEX "SeriesSubmission_status_submittedAt_idx" ON "SeriesSubmission"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "SeriesSubmission_applicantId_createdAt_idx" ON "SeriesSubmission"("applicantId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ShortForm_publicationId_key" ON "ShortForm"("publicationId");

-- CreateIndex
CREATE INDEX "ShortForm_status_publishedAt_id_idx" ON "ShortForm"("status", "publishedAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "ShortForm_musicKey_idx" ON "ShortForm"("musicKey");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityCategory_slug_key" ON "CommunityCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPost_publicationId_key" ON "CommunityPost"("publicationId");

-- CreateIndex
CREATE INDEX "CommunityPost_categoryId_status_publishedAt_idx" ON "CommunityPost"("categoryId", "status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityPost_status_publishedAt_id_idx" ON "CommunityPost"("status", "publishedAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Playlist_ownerId_updatedAt_idx" ON "Playlist"("ownerId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "PlaylistItem_publicationId_idx" ON "PlaylistItem"("publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistItem_playlistId_position_key" ON "PlaylistItem"("playlistId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Series_singleWorkPublicationId_key" ON "Series"("singleWorkPublicationId");

-- CreateIndex
CREATE INDEX "Series_publicationStatus_releaseDate_idx" ON "Series"("publicationStatus", "releaseDate" DESC);

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_posterAssetId_fkey" FOREIGN KEY ("posterAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_backdropAssetId_fkey" FOREIGN KEY ("backdropAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_singleWorkPublicationId_fkey" FOREIGN KEY ("singleWorkPublicationId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeVideo" ADD CONSTRAINT "HomeVideo_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeVideo" ADD CONSTRAINT "HomeVideo_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_homeVideoId_fkey" FOREIGN KEY ("homeVideoId") REFERENCES "HomeVideo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesSeason" ADD CONSTRAINT "SeriesSeason_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesEpisode" ADD CONSTRAINT "SeriesEpisode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesEpisode" ADD CONSTRAINT "SeriesEpisode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "SeriesSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesEpisode" ADD CONSTRAINT "SeriesEpisode_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesSubmission" ADD CONSTRAINT "SeriesSubmission_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesSubmission" ADD CONSTRAINT "SeriesSubmission_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesSubmission" ADD CONSTRAINT "SeriesSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortForm" ADD CONSTRAINT "ShortForm_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortForm" ADD CONSTRAINT "ShortForm_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CommunityCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill the explicit product domains from the legacy universal publication
-- rows. IDs remain on Post as compatibility identifiers while API/UI slices
-- migrate, so existing links, likes, comments, saves, and reports keep working.
UPDATE "Series"
SET "publicationStatus" = 'PUBLISHED',
    "synopsis" = "description",
    "releaseDate" = "createdAt";

INSERT INTO "HomeVideo" (
    "id", "creatorId", "publicationId", "title", "description", "status",
    "publishedAt", "createdAt", "updatedAt"
)
SELECT gen_random_uuid(), p."authorId", p."id",
       COALESCE(p."title", NULLIF(p."caption", ''), '제목 없는 영상'),
       p."caption", 'PUBLISHED', p."publishedAt", p."createdAt", p."updatedAt"
FROM "Post" p
WHERE p."format" = 'LONG_VIDEO'
  AND p."status" = 'PUBLISHED'
  AND p."seriesId" IS NULL;

INSERT INTO "SeriesEpisode" (
    "id", "seriesId", "publicationId", "episodeNumber", "title", "synopsis",
    "publishedAt", "createdAt", "updatedAt"
)
SELECT gen_random_uuid(), p."seriesId", p."id", p."episodeNumber",
       COALESCE(p."title", NULLIF(p."caption", ''), '제목 없는 에피소드'),
       p."caption", p."publishedAt", p."createdAt", p."updatedAt"
FROM "Post" p
WHERE p."format" = 'LONG_VIDEO'
  AND p."seriesId" IS NOT NULL
  AND p."episodeNumber" IS NOT NULL;

INSERT INTO "ShortForm" (
    "id", "creatorId", "publicationId", "type", "title", "description",
    "status", "publishedAt", "createdAt", "updatedAt"
)
SELECT gen_random_uuid(), p."authorId", p."id", 'VIDEO', p."title", p."caption",
       'PUBLISHED', p."publishedAt", p."createdAt", p."updatedAt"
FROM "Post" p
WHERE p."format" = 'SHORT_VIDEO' AND p."status" = 'PUBLISHED';

INSERT INTO "CommunityPost" (
    "id", "authorId", "publicationId", "type", "body", "status",
    "publishedAt", "createdAt", "updatedAt"
)
SELECT gen_random_uuid(), p."authorId", p."id", 'IMAGE', p."caption",
       'PUBLISHED', p."publishedAt", p."createdAt", p."updatedAt"
FROM "Post" p
WHERE p."format" = 'IMAGE' AND p."status" = 'PUBLISHED';
