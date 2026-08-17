-- Product playback points at MediaAsset directly. LegacyPublication remains a
-- compatibility aggregate for engagement/feed while those capabilities move.
ALTER TABLE "HomeVideo" ADD COLUMN "videoAssetId" UUID;
ALTER TABLE "Series" ADD COLUMN "singleWorkAssetId" UUID;
ALTER TABLE "SeriesEpisode" ADD COLUMN "videoAssetId" UUID;

UPDATE "HomeVideo" h
SET "videoAssetId" = pm."assetId"
FROM "PostMedia" pm
WHERE pm."postId" = h."publicationId" AND pm."order" = 0;

UPDATE "Series" s
SET "singleWorkAssetId" = pm."assetId"
FROM "PostMedia" pm
WHERE pm."postId" = s."singleWorkPublicationId" AND pm."order" = 0;

UPDATE "SeriesEpisode" e
SET "videoAssetId" = pm."assetId"
FROM "PostMedia" pm
WHERE pm."postId" = e."publicationId" AND pm."order" = 0;

ALTER TABLE "HomeVideo" ADD CONSTRAINT "HomeVideo_videoAssetId_fkey"
  FOREIGN KEY ("videoAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Series" ADD CONSTRAINT "Series_singleWorkAssetId_fkey"
  FOREIGN KEY ("singleWorkAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SeriesEpisode" ADD CONSTRAINT "SeriesEpisode_videoAssetId_fkey"
  FOREIGN KEY ("videoAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "HomeVideo_videoAssetId_idx" ON "HomeVideo"("videoAssetId");
CREATE INDEX "Series_singleWorkAssetId_idx" ON "Series"("singleWorkAssetId");
CREATE INDEX "SeriesEpisode_videoAssetId_idx" ON "SeriesEpisode"("videoAssetId");
