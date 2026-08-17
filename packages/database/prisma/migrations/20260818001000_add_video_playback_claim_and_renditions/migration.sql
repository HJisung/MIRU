-- A video asset can be claimed by only one product playback entity, even when
-- incompatible attachment requests race in separate transactions.
CREATE TABLE "MediaPlaybackClaim" (
    "assetId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaPlaybackClaim_pkey" PRIMARY KEY ("assetId")
);

ALTER TABLE "MediaPlaybackClaim"
ADD CONSTRAINT "MediaPlaybackClaim_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaAsset" ADD COLUMN "videoRenditions" JSONB;
