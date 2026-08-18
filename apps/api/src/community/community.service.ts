import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityPostType,
  DomainPublicationStatus,
  EngagementTargetType,
  MediaPurpose,
  MediaStatus,
  PostFormat,
  PostStatus,
  PostVisibility,
} from '@stream/database';
import type { Prisma } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { MediaAttachmentService } from '../media/media-attachment.service.js';
import { toPlayableMedia } from '../playback/playback.mapper.js';
import type {
  CreateCommunityImagePostDto,
  CreateCommunityLinkPostDto,
  CreateCommunityTextPostDto,
  CreateCommunityVideoPostDto,
  UpdateCommunityPostDto,
} from './community.dto.js';

const include = {
  author: {
    select: { id: true, handle: true, displayName: true, avatarUrl: true },
  },
  category: { select: { id: true, slug: true, name: true, description: true } },
  publication: { select: { likeCount: true, commentCount: true } },
  engagementTarget: { select: { likeCount: true, commentCount: true } },
  media: {
    where: { asset: { status: MediaStatus.READY } },
    orderBy: { position: 'asc' as const },
    include: { asset: true },
  },
} as const;

type CommunityPostRecord = Prisma.CommunityPostGetPayload<{
  include: typeof include;
}>;

type CreateInput =
  | CreateCommunityTextPostDto
  | CreateCommunityImagePostDto
  | CreateCommunityVideoPostDto
  | CreateCommunityLinkPostDto;

@Injectable()
export class CommunityService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(MediaAttachmentService)
    private readonly mediaAttachments: MediaAttachmentService,
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

  createText(userId: string, input: CreateCommunityTextPostDto) {
    return this.create(userId, CommunityPostType.TEXT, input);
  }

  createImage(userId: string, input: CreateCommunityImagePostDto) {
    return this.create(userId, CommunityPostType.IMAGE, input);
  }

  createVideo(userId: string, input: CreateCommunityVideoPostDto) {
    return this.create(userId, CommunityPostType.VIDEO, input);
  }

  createLink(userId: string, input: CreateCommunityLinkPostDto) {
    return this.create(userId, CommunityPostType.LINK, input);
  }

  async listMine(userId: string) {
    const records = await this.database.client.communityPost.findMany({
      where: { authorId: userId },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
    return { items: records.map((record) => this.mapManaged(record)) };
  }

  async findManaged(userId: string, id: string) {
    const record = await this.database.client.communityPost.findFirst({
      where: { id, authorId: userId },
      include,
    });
    if (!record) throw new NotFoundException('Community Post not found');
    return this.mapManaged(record);
  }

  async update(userId: string, id: string, input: UpdateCommunityPostDto) {
    await this.database.client.$transaction(async (tx) => {
      const record = await tx.communityPost.findFirst({
        where: {
          id,
          authorId: userId,
          status: DomainPublicationStatus.PUBLISHED,
        },
        select: { type: true, publicationId: true, body: true, linkUrl: true },
      });
      if (!record) throw new NotFoundException('Community Post not found');
      const body = input.body === undefined ? record.body : input.body;
      const linkUrl =
        input.linkUrl === undefined ? record.linkUrl : input.linkUrl?.trim();
      this.assertBody(record.type, body);
      if (record.type === CommunityPostType.LINK) this.assertLink(linkUrl);
      else if (input.linkUrl !== undefined)
        throw new BadRequestException('Only LINK Posts have linkUrl');
      const categoryId =
        input.categorySlug === undefined
          ? undefined
          : await this.categoryId(tx, input.categorySlug);
      await tx.communityPost.update({
        where: { id },
        data: {
          body,
          linkUrl: record.type === CommunityPostType.LINK ? linkUrl : null,
          ...(categoryId !== undefined ? { categoryId } : {}),
        },
      });
      await tx.post.update({
        where: { id: record.publicationId },
        data: { caption: body },
      });
    });
    return this.findManaged(userId, id);
  }

  async archive(userId: string, id: string) {
    await this.database.client.$transaction(async (tx) => {
      const record = await tx.communityPost.findFirst({
        where: { id, authorId: userId },
        select: { status: true, publicationId: true },
      });
      if (!record) throw new NotFoundException('Community Post not found');
      if (record.status === DomainPublicationStatus.ARCHIVED) return;
      if (record.status !== DomainPublicationStatus.PUBLISHED)
        throw new NotFoundException('Published Community Post not found');
      await tx.communityPost.update({
        where: { id },
        data: {
          status: DomainPublicationStatus.ARCHIVED,
          publishedAt: null,
        },
      });
      await tx.post.update({
        where: { id: record.publicationId },
        data: { status: PostStatus.ARCHIVED, publishedAt: null },
      });
    });
    return this.findManaged(userId, id);
  }

  async listCategories() {
    const items = await this.database.client.communityCategory.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, description: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { items };
  }

  private async create(
    userId: string,
    type: CommunityPostType,
    input: CreateInput,
  ) {
    const existing = await this.findByCreation(userId, input.creationId);
    if (existing) return this.mapCreationRetry(existing);
    const body = 'body' in input ? input.body : input.caption;
    this.assertBody(type, body);
    const linkUrl = 'linkUrl' in input ? input.linkUrl.trim() : null;
    if (type === CommunityPostType.LINK) this.assertLink(linkUrl);
    const assetId = 'assetId' in input ? input.assetId : null;
    try {
      const id = await this.database.client.$transaction(async (tx) => {
        const retry = await tx.communityPost.findUnique({
          where: {
            authorId_creationId: {
              authorId: userId,
              creationId: input.creationId,
            },
          },
          select: { id: true },
        });
        if (retry) return retry.id;
        const categoryId = await this.categoryId(tx, input.categorySlug);
        let asset: { id: string } | null = null;
        if (type === CommunityPostType.IMAGE && assetId) {
          asset = await tx.mediaAsset.findFirst({
            where: {
              id: assetId,
              ownerId: userId,
              kind: 'IMAGE',
              purpose: MediaPurpose.POST_IMAGE,
              status: MediaStatus.READY,
              communityLinks: { none: {} },
              postLinks: { none: {} },
            },
            select: { id: true },
          });
          if (!asset)
            throw new NotFoundException('Ready unlinked image asset not found');
        }
        if (type === CommunityPostType.VIDEO && assetId) {
          asset = await this.mediaAttachments.claimOwnedVideo(
            tx,
            userId,
            assetId,
            MediaPurpose.POST_VIDEO,
            [MediaStatus.READY],
            'COMMUNITY_POST_VIDEO',
          );
        }
        const publishedAt = new Date();
        const created = await tx.post.create({
          data: {
            authorId: userId,
            format: this.compatibilityFormat(type),
            status: PostStatus.PUBLISHED,
            visibility: PostVisibility.PUBLIC,
            caption: body,
            publishedAt,
            ...(asset
              ? { media: { create: { assetId: asset.id, order: 0 } } }
              : {}),
            communityPost: {
              create: {
                authorId: userId,
                creationId: input.creationId,
                categoryId,
                type,
                body,
                linkUrl,
                status: DomainPublicationStatus.PUBLISHED,
                publishedAt,
                engagementTarget: {
                  create: { type: EngagementTargetType.COMMUNITY_POST },
                },
                ...(asset
                  ? { media: { create: { assetId: asset.id, position: 0 } } }
                  : {}),
              },
            },
          },
          select: { communityPost: { select: { id: true } } },
        });
        if (!created.communityPost)
          throw new Error('Community Post creation failed');
        return created.communityPost.id;
      });
      return this.findOne(id);
    } catch (error) {
      const retry = await this.findByCreation(userId, input.creationId);
      if (retry) return this.mapCreationRetry(retry);
      if (this.prismaCode(error) === 'P2002') {
        throw new ConflictException(
          'Creation identity or media is already used',
        );
      }
      throw error;
    }
  }

  private findByCreation(userId: string, creationId: string) {
    return this.database.client.communityPost.findUnique({
      where: { authorId_creationId: { authorId: userId, creationId } },
      include,
    });
  }

  private async categoryId(
    tx: Prisma.TransactionClient,
    slug?: string | null,
  ): Promise<string | null> {
    if (!slug) return null;
    const category = await tx.communityCategory.findFirst({
      where: { slug, isActive: true },
      select: { id: true },
    });
    if (!category)
      throw new NotFoundException('Active Community Category not found');
    return category.id;
  }

  private assertBody(type: CommunityPostType, body: string) {
    if (type === CommunityPostType.TEXT && !body.trim())
      throw new BadRequestException('TEXT Post body must not be blank');
  }

  private assertLink(value: string | null | undefined) {
    if (!value) throw new BadRequestException('LINK Post requires linkUrl');
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('linkUrl must be a valid URL');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
      throw new BadRequestException('linkUrl must use http or https');
  }

  private compatibilityFormat(type: CommunityPostType) {
    switch (type) {
      case CommunityPostType.TEXT:
        return PostFormat.COMMUNITY_TEXT;
      case CommunityPostType.IMAGE:
        return PostFormat.IMAGE;
      case CommunityPostType.VIDEO:
        return PostFormat.COMMUNITY_VIDEO;
      case CommunityPostType.LINK:
        return PostFormat.COMMUNITY_LINK;
    }
  }

  private prismaCode(error: unknown) {
    return typeof error === 'object' && error
      ? (error as { code?: unknown }).code
      : undefined;
  }

  private map(record: CommunityPostRecord) {
    if (!record.publishedAt)
      throw new Error(
        `Published Community Post ${record.id} has no publishedAt`,
      );
    return {
      ...this.mapFields(record),
      publishedAt: record.publishedAt.toISOString(),
    };
  }

  private mapCreationRetry(record: CommunityPostRecord) {
    if (
      record.status !== DomainPublicationStatus.PUBLISHED ||
      !record.publishedAt
    )
      throw new ConflictException('Community Post is no longer published');
    return this.map(record);
  }

  private mapManaged(record: CommunityPostRecord) {
    return {
      ...this.mapFields(record),
      status: record.status,
      publishedAt: record.publishedAt?.toISOString() ?? null,
    };
  }

  private mapFields(record: CommunityPostRecord) {
    return {
      id: record.id,
      engagementTarget: { type: 'COMMUNITY_POST' as const, id: record.id },
      type: record.type,
      body: record.body,
      linkUrl: record.linkUrl,
      likeCount: record.engagementTarget?.likeCount ?? 0,
      commentCount: record.engagementTarget?.commentCount ?? 0,
      author: record.author,
      category: record.category,
      media: record.media.map(({ asset }) => {
        const media = toPlayableMedia(asset);
        if (!media)
          throw new Error(
            `Ready media ${asset.id} is missing display metadata`,
          );
        return media;
      }),
    };
  }
}
