-- Product media reads now start from Shortform and Community Post instead of
-- traversing the LegacyPublication compatibility aggregate.
CREATE TABLE "ShortFormMedia" (
    "shortFormId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "ShortFormMedia_pkey" PRIMARY KEY ("shortFormId", "assetId")
);

CREATE TABLE "CommunityPostMedia" (
    "communityPostId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "CommunityPostMedia_pkey" PRIMARY KEY ("communityPostId", "assetId")
);

CREATE UNIQUE INDEX "ShortFormMedia_shortFormId_position_key" ON "ShortFormMedia"("shortFormId", "position");
CREATE INDEX "ShortFormMedia_assetId_idx" ON "ShortFormMedia"("assetId");
CREATE UNIQUE INDEX "CommunityPostMedia_communityPostId_position_key" ON "CommunityPostMedia"("communityPostId", "position");
CREATE INDEX "CommunityPostMedia_assetId_idx" ON "CommunityPostMedia"("assetId");
CREATE INDEX "ShortForm_promotedHomeVideoId_idx" ON "ShortForm"("promotedHomeVideoId");
CREATE INDEX "ShortForm_promotedSeriesId_idx" ON "ShortForm"("promotedSeriesId");
CREATE INDEX "ShortForm_promotedEpisodeId_idx" ON "ShortForm"("promotedEpisodeId");

ALTER TABLE "ShortFormMedia" ADD CONSTRAINT "ShortFormMedia_shortFormId_fkey" FOREIGN KEY ("shortFormId") REFERENCES "ShortForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShortFormMedia" ADD CONSTRAINT "ShortFormMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityPostMedia" ADD CONSTRAINT "CommunityPostMedia_communityPostId_fkey" FOREIGN KEY ("communityPostId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPostMedia" ADD CONSTRAINT "CommunityPostMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShortForm" ADD CONSTRAINT "ShortForm_promotedHomeVideoId_fkey" FOREIGN KEY ("promotedHomeVideoId") REFERENCES "HomeVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShortForm" ADD CONSTRAINT "ShortForm_promotedSeriesId_fkey" FOREIGN KEY ("promotedSeriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShortForm" ADD CONSTRAINT "ShortForm_promotedEpisodeId_fkey" FOREIGN KEY ("promotedEpisodeId") REFERENCES "SeriesEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ShortFormMedia" ("shortFormId", "assetId", "position")
SELECT sf."id", pm."assetId", pm."order"
FROM "ShortForm" sf
JOIN "PostMedia" pm ON pm."postId" = sf."publicationId";

INSERT INTO "CommunityPostMedia" ("communityPostId", "assetId", "position")
SELECT cp."id", pm."assetId", pm."order"
FROM "CommunityPost" cp
JOIN "PostMedia" pm ON pm."postId" = cp."publicationId";
