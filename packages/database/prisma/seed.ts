import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import {
  CommunityPostType,
  DomainPublicationStatus,
  MediaKind,
  MediaPurpose,
  MediaStatus,
  PostFormat,
  PostStatus,
  PostVisibility,
  PrismaClient,
  SeriesSubmissionStatus,
  SeriesWorkType,
  ShortFormType,
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

const craftSeriesId = "40000000-0000-4000-8000-000000000001";
const craftEpisodeAssetId = "20000000-0000-4000-8000-000000000007";
const craftEpisodePostId = "30000000-0000-4000-8000-000000000007";

async function seed() {
  await prisma.$transaction([
    prisma.playlistItem.deleteMany(),
    prisma.playlist.deleteMany(),
    prisma.communityPost.deleteMany(),
    prisma.communityCategory.deleteMany(),
    prisma.shortForm.deleteMany(),
    prisma.seriesSubmission.deleteMany(),
    prisma.seriesEpisode.deleteMany(),
    prisma.seriesSeason.deleteMany(),
    prisma.collectionItem.deleteMany(),
    prisma.collection.deleteMany(),
    prisma.homeVideo.deleteMany(),
    prisma.postMedia.deleteMany(),
    prisma.post.deleteMany(),
    prisma.series.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  for (const user of demoUsers) await prisma.user.create({ data: user });

  await prisma.series.create({
    data: {
      id: craftSeriesId,
      creatorId: demoUsers[2].id,
      title: "손으로 만드는 도시",
      description: "오래된 기술과 손의 감각을 기록하는 다큐멘터리 시리즈",
      synopsis:
        "서울 곳곳에서 오래된 기술을 이어가는 사람과 손의 시간을 기록합니다.",
      workType: SeriesWorkType.EPISODIC,
      publicationStatus: DomainPublicationStatus.PUBLISHED,
      genres: ["다큐멘터리", "라이프스타일"],
      tags: ["장인", "서울", "기록"],
      ageRating: "ALL",
      productionInfo: { studio: "Field Notes", country: "KR" },
      releaseDate: new Date("2026-08-11T12:00:00.000Z"),
    },
  });

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
        ...(post.id === "30000000-0000-4000-8000-000000000003"
          ? { seriesId: craftSeriesId, episodeNumber: 1 }
          : {}),
        media: { create: { assetId: post.assetId, order: 0 } },
      },
    });
  }

  await prisma.mediaAsset.create({
    data: {
      id: craftEpisodeAssetId,
      ownerId: demoUsers[2].id,
      kind: MediaKind.VIDEO,
      purpose: MediaPurpose.LONG_VIDEO,
      status: MediaStatus.READY,
      sourceKey: `demo/${craftEpisodeAssetId}/source`,
      publicUrl: "/demo/ceramic-hands.png",
      mimeType: "image/png",
      width: 1600,
      height: 900,
      durationMs: 1_536_000,
      byteSize: BigInt(0),
    },
  });
  await prisma.post.create({
    data: {
      id: craftEpisodePostId,
      authorId: demoUsers[2].id,
      format: PostFormat.LONG_VIDEO,
      status: PostStatus.PUBLISHED,
      visibility: PostVisibility.PUBLIC,
      title: "흙이 그릇이 되는 시간",
      caption: "두 번째 이야기. 흙과 불, 그리고 도예가의 손을 따라갑니다.",
      publishedAt: new Date("2026-08-11T12:00:00.000Z"),
      likeCount: 3_418,
      commentCount: 126,
      seriesId: craftSeriesId,
      episodeNumber: 2,
      media: { create: { assetId: craftEpisodeAssetId, order: 0 } },
    },
  });

  const standalone = demoPosts.find(
    (post) => post.id === "30000000-0000-4000-8000-000000000005",
  );
  if (!standalone) throw new Error("Standalone Home demo video is missing");

  const homeVideo = await prisma.homeVideo.create({
    data: {
      id: "50000000-0000-4000-8000-000000000001",
      creatorId: standalone.authorId,
      publicationId: standalone.id,
      title: standalone.title,
      description: standalone.caption,
      status: DomainPublicationStatus.PUBLISHED,
      publishedAt: standalone.publishedAt,
    },
  });

  await prisma.collection.create({
    data: {
      id: "60000000-0000-4000-8000-000000000001",
      ownerId: standalone.authorId,
      title: "두 바퀴로 만나는 섬",
      description: "자전거로 천천히 지나간 길과 풍경을 모았습니다.",
      status: DomainPublicationStatus.PUBLISHED,
      publishedAt: new Date("2026-08-10T10:00:00.000Z"),
      items: { create: { homeVideoId: homeVideo.id, position: 1 } },
    },
  });

  await prisma.seriesEpisode.createMany({
    data: [
      {
        id: "70000000-0000-4000-8000-000000000001",
        seriesId: craftSeriesId,
        publicationId: "30000000-0000-4000-8000-000000000003",
        episodeNumber: 1,
        title: "서울의 마지막 활판 인쇄공",
        synopsis: "잉크와 활자, 사십 년의 손기억을 기록합니다.",
        publishedAt: new Date("2026-08-13T12:00:00.000Z"),
      },
      {
        id: "70000000-0000-4000-8000-000000000002",
        seriesId: craftSeriesId,
        publicationId: craftEpisodePostId,
        episodeNumber: 2,
        title: "흙이 그릇이 되는 시간",
        synopsis: "흙과 불, 그리고 도예가의 손을 따라갑니다.",
        publishedAt: new Date("2026-08-11T12:00:00.000Z"),
      },
    ],
  });

  await prisma.seriesSubmission.create({
    data: {
      id: "71000000-0000-4000-8000-000000000001",
      seriesId: craftSeriesId,
      applicantId: demoUsers[2].id,
      status: SeriesSubmissionStatus.APPROVED,
      submittedAt: new Date("2026-08-01T09:00:00.000Z"),
      reviewedById: demoUsers[2].id,
      reviewedAt: new Date("2026-08-02T09:00:00.000Z"),
      decisionReason: "작품 정보와 공개 권한을 확인했습니다.",
    },
  });

  for (const post of demoPosts.filter(
    (item) => item.format === PostFormat.SHORT_VIDEO,
  )) {
    await prisma.shortForm.create({
      data: {
        creatorId: post.authorId,
        publicationId: post.id,
        type: ShortFormType.VIDEO,
        title: post.title,
        description: post.caption,
        status: DomainPublicationStatus.PUBLISHED,
        publishedAt: post.publishedAt,
      },
    });
  }

  const developCategory = await prisma.communityCategory.create({
    data: {
      id: "80000000-0000-4000-8000-000000000001",
      slug: "develop",
      name: "Develop",
      description: "개발과 기술에 관한 이야기",
      sortOrder: 10,
    },
  });
  await prisma.communityCategory.createMany({
    data: [
      { slug: "ride", name: "Ride", sortOrder: 20 },
      { slug: "soccer", name: "Soccer", sortOrder: 30 },
      { slug: "baseball", name: "Baseball", sortOrder: 40 },
      {
        slug: "internet-broadcasting",
        name: "Internet Broadcasting",
        sortOrder: 50,
      },
    ],
  });

  const imagePosts = demoPosts.filter(
    (item) => item.format === PostFormat.IMAGE,
  );
  for (const [index, post] of imagePosts.entries()) {
    await prisma.communityPost.create({
      data: {
        authorId: post.authorId,
        publicationId: post.id,
        categoryId: index === 0 ? null : developCategory.id,
        type: CommunityPostType.IMAGE,
        body: post.caption,
        status: DomainPublicationStatus.PUBLISHED,
        publishedAt: post.publishedAt,
      },
    });
  }
}

seed()
  .then(() =>
    console.log(
      `Seeded ${demoUsers.length} creators across the MIRU product domains.`,
    ),
  )
  .finally(async () => prisma.$disconnect());
