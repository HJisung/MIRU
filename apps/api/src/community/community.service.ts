import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DomainPublicationStatus, MediaStatus } from '@stream/database';
import type { Prisma } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';

const include = {
  author: {
    select: { id: true, handle: true, displayName: true, avatarUrl: true },
  },
  category: { select: { id: true, slug: true, name: true, description: true } },
  publication: { select: { likeCount: true, commentCount: true } },
  media: {
    where: { asset: { status: MediaStatus.READY } },
    orderBy: { position: 'asc' as const },
    include: { asset: true },
  },
} as const;

type CommunityPostRecord = Prisma.CommunityPostGetPayload<{
  include: typeof include;
}>;

@Injectable()
export class CommunityService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async list(categorySlug?: string) {
    const records = await this.database.client.communityPost.findMany({
      where: {
        status: DomainPublicationStatus.PUBLISHED,
        publishedAt: { not: null },
        category: categorySlug ? { slug: categorySlug, isActive: true } : null,
      },
      include,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 30,
    });
    return { items: records.map((record) => this.map(record)) };
  }

  async findOne(id: string) {
    const record = await this.database.client.communityPost.findFirst({
      where: {
        id,
        status: DomainPublicationStatus.PUBLISHED,
        publishedAt: { not: null },
      },
      include,
    });
    if (!record) throw new NotFoundException('Community Post not found');
    return this.map(record);
  }

  async listCategories() {
    const items = await this.database.client.communityCategory.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, description: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { items };
  }

  private map(record: CommunityPostRecord) {
    if (!record.publishedAt)
      throw new Error(
        `Published Community Post ${record.id} has no publishedAt`,
      );
    return {
      id: record.id,
      engagementTarget: { type: 'COMMUNITY_POST' as const, id: record.id },
      type: record.type,
      body: record.body,
      linkUrl: record.linkUrl,
      publishedAt: record.publishedAt.toISOString(),
      likeCount: record.publication.likeCount,
      commentCount: record.publication.commentCount,
      author: record.author,
      category: record.category,
      media: record.media.map(({ asset }) => {
        if (
          !asset.publicUrl ||
          !asset.mimeType ||
          !asset.width ||
          !asset.height
        )
          throw new Error(
            `Ready media ${asset.id} is missing display metadata`,
          );
        return {
          id: asset.id,
          url: asset.publicUrl,
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          durationMs: asset.durationMs,
        };
      }),
    };
  }
}
