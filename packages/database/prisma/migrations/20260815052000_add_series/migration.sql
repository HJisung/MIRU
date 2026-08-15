-- CreateTable
CREATE TABLE "Series" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Post"
ADD COLUMN "seriesId" UUID,
ADD COLUMN "episodeNumber" INTEGER;

-- CreateIndex
CREATE INDEX "Series_creatorId_createdAt_idx" ON "Series"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Post_seriesId_episodeNumber_key" ON "Post"("seriesId", "episodeNumber");

-- CreateIndex
CREATE INDEX "Post_seriesId_idx" ON "Post"("seriesId");

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
