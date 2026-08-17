ALTER TYPE "MediaPurpose" ADD VALUE 'POST_VIDEO';

ALTER TYPE "PostFormat" ADD VALUE 'COMMUNITY_TEXT';
ALTER TYPE "PostFormat" ADD VALUE 'COMMUNITY_VIDEO';
ALTER TYPE "PostFormat" ADD VALUE 'COMMUNITY_LINK';

ALTER TABLE "CommunityPost"
ADD COLUMN "creationId" UUID;

CREATE UNIQUE INDEX "CommunityPost_authorId_creationId_key"
ON "CommunityPost"("authorId", "creationId");
