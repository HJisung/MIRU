import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import {
  MediaKind,
  MediaPurpose,
  MediaStatus,
  PostFormat,
  PostStatus,
  PostVisibility,
  PrismaClient,
  UserRole,
} from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(packageDirectory, "../../.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("DATABASE_URL is required to seed the database.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const demoUsers = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    email: "nara@example.test",
    handle: "nara.frames",
    displayName: "Nara",
    bio: "Quiet cities, warm light, and small stories.",
    avatarUrl: null,
    role: UserRole.MEMBER,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    email: "minho@example.test",
    handle: "minho.moves",
    displayName: "Minho",
    bio: "Movement, mountains, and the road between them.",
    avatarUrl: null,
    role: UserRole.MEMBER,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    email: "studio@example.test",
    handle: "field.notes",
    displayName: "Field Notes",
    bio: "Slow documentaries about people who make things.",
    avatarUrl: null,
    role: UserRole.ADMIN,
  },
] as const;

const demoPosts = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    assetId: "20000000-0000-4000-8000-000000000001",
    authorId: demoUsers[0].id,
    format: PostFormat.IMAGE,
    purpose: MediaPurpose.POST_IMAGE,
    title: null,
    caption: "The city gets softer just before everyone wakes up.",
    mediaUrl: "/demo/dawn-city.png",
    width: 1600,
    height: 1200,
    publishedAt: new Date("2026-08-14T22:40:00.000Z"),
    likeCount: 1842,
    commentCount: 63,
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    assetId: "20000000-0000-4000-8000-000000000002",
    authorId: demoUsers[1].id,
    format: PostFormat.SHORT_VIDEO,
    purpose: MediaPurpose.SHORT_VIDEO,
    title: null,
    caption: "Thirty seconds above the tree line.",
    mediaUrl: "/demo/alpine-trail.png",
    width: 1080,
    height: 1350,
    durationMs: 32_000,
    publishedAt: new Date("2026-08-14T18:15:00.000Z"),
    likeCount: 9614,
    commentCount: 214,
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    assetId: "20000000-0000-4000-8000-000000000003",
    authorId: demoUsers[2].id,
    format: PostFormat.LONG_VIDEO,
    purpose: MediaPurpose.LONG_VIDEO,
    title: "A day with Seoul's last letterpress printer",
    caption: "Ink, metal type, and forty years of muscle memory.",
    mediaUrl: "/demo/letterpress.png",
    width: 1600,
    height: 900,
    durationMs: 1_124_000,
    publishedAt: new Date("2026-08-13T12:00:00.000Z"),
    likeCount: 4287,
    commentCount: 189,
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    assetId: "20000000-0000-4000-8000-000000000004",
    authorId: demoUsers[0].id,
    format: PostFormat.IMAGE,
    purpose: MediaPurpose.POST_IMAGE,
    title: null,
    caption: "A table for two and nowhere else to be.",
    mediaUrl: "/demo/summer-table.png",
    width: 1600,
    height: 1200,
    publishedAt: new Date("2026-08-12T08:20:00.000Z"),
    likeCount: 2391,
    commentCount: 71,
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    assetId: "20000000-0000-4000-8000-000000000005",
    authorId: demoUsers[1].id,
    format: PostFormat.LONG_VIDEO,
    purpose: MediaPurpose.LONG_VIDEO,
    title: "Crossing Jeju by bicycle",
    caption: "Wind, volcanic roads, and one very long afternoon.",
    mediaUrl: "/demo/jeju-ride.png",
    width: 1600,
    height: 900,
    durationMs: 2_486_000,
    publishedAt: new Date("2026-08-10T09:00:00.000Z"),
    likeCount: 7812,
    commentCount: 326,
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    assetId: "20000000-0000-4000-8000-000000000006",
    authorId: demoUsers[2].id,
    format: PostFormat.SHORT_VIDEO,
    purpose: MediaPurpose.SHORT_VIDEO,
    title: null,
    caption: "Clay remembers every touch.",
    mediaUrl: "/demo/ceramic-hands.png",
    width: 1080,
    height: 1350,
    durationMs: 48_000,
    publishedAt: new Date("2026-08-09T16:45:00.000Z"),
    likeCount: 11_203,
    commentCount: 408,
  },
] as const;

async function seed() {
  await prisma.$transaction([
    prisma.postMedia.deleteMany(),
    prisma.post.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  for (const user of demoUsers) await prisma.user.create({ data: user });

  for (const post of demoPosts) {
    await prisma.mediaAsset.create({
      data: {
        id: post.assetId,
        ownerId: post.authorId,
        kind:
          post.format === PostFormat.IMAGE ? MediaKind.IMAGE : MediaKind.VIDEO,
        purpose: post.purpose,
        status: MediaStatus.READY,
        sourceKey: `demo/${post.assetId}/source`,
        publicUrl: post.mediaUrl,
        mimeType: "image/png",
        width: post.width,
        height: post.height,
        durationMs: "durationMs" in post ? post.durationMs : null,
        byteSize: BigInt(0),
      },
    });

    await prisma.post.create({
      data: {
        id: post.id,
        authorId: post.authorId,
        format: post.format,
        status: PostStatus.PUBLISHED,
        visibility: PostVisibility.PUBLIC,
        title: post.title,
        caption: post.caption,
        publishedAt: post.publishedAt,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        media: { create: { assetId: post.assetId, order: 0 } },
      },
    });
  }
}

seed()
  .then(() =>
    console.log(
      `Seeded ${demoUsers.length} creators and ${demoPosts.length} posts.`,
    ),
  )
  .finally(async () => prisma.$disconnect());
