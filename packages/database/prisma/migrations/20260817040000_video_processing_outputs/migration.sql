ALTER TABLE "MediaAsset"
  ADD COLUMN "failureMessage" TEXT,
  ADD COLUMN "hlsManifestKey" TEXT,
  ADD COLUMN "posterKey" TEXT,
  ADD COLUMN "processedAt" TIMESTAMP(3);
