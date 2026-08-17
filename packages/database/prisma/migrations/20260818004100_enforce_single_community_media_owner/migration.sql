DROP INDEX "CommunityPostMedia_assetId_idx";

CREATE UNIQUE INDEX "CommunityPostMedia_assetId_key"
ON "CommunityPostMedia"("assetId");
