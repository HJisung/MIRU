import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CommunityPostType,
  DomainPublicationStatus,
  MediaPurpose,
  MediaStatus,
  PostFormat,
  PostStatus,
  PostVisibility,
} from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { toFeedItem } from '../feed/feed.mapper.js';
import type { CreateImagePostDto } from './posts.dto.js';
import type { LegacyCreateCommunityImagePostDto } from '../community/community.dto.js';

@Injectable()
export class PostsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async findPublished(postId: string) {
    const post = await this.database.client.post.findFirst({
      where: {
        id: postId,
        status: PostStatus.PUBLISHED,
        visibility: PostVisibility.PUBLIC,
        communityPost: null,
      },
      include: {
        series: {
          select: {
            id: true,
            title: true,
            _count: { select: { posts: true } },
          },
        },
        author: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        media: {
          where: { asset: { status: MediaStatus.READY } },
          orderBy: { order: 'asc' },
          include: { asset: true },
        },
      },
    });
    if (!post) {
      throw new NotFoundException({
        error: {
          code: 'POST_NOT_FOUND',
          message: 'The post does not exist or is not visible.',
        },
      });
    }
    return toFeedItem(post);
  }

  async createImagePost(userId: string, input: CreateImagePostDto) {
    const created = await this.createCommunityImagePost(userId, input);
    return {
      id: created.engagementTargetId,
      status: PostStatus.PUBLISHED,
      publishedAt: created.publishedAt,
    };
  }

  async createCommunityImagePost(
    userId: string,
    input: LegacyCreateCommunityImagePostDto,
  ) {
    const asset = await this.database.client.mediaAsset.findFirst({
      where: {
        id: input.assetId,
        ownerId: userId,
        purpose: MediaPurpose.POST_IMAGE,
        status: MediaStatus.READY,
        postLinks: { none: {} },
      },
    });
    if (!asset)
      throw new NotFoundException('Ready unlinked image asset not found');
    const category = input.categorySlug
      ? await this.database.client.communityCategory.findFirst({
          where: { slug: input.categorySlug, isActive: true },
          select: { id: true },
        })
      : null;
    if (input.categorySlug && !category)
      throw new NotFoundException('Active Community Category not found');
    const publishedAt = new Date();
    const created = await this.database.client.post.create({
      data: {
        authorId: userId,
        format: PostFormat.IMAGE,
        status: PostStatus.PUBLISHED,
        visibility: PostVisibility.PUBLIC,
        caption: input.caption.trim(),
        publishedAt,
        media: { create: { assetId: asset.id, order: 0 } },
        communityPost: {
          create: {
            authorId: userId,
            categoryId: category?.id,
            type: CommunityPostType.IMAGE,
            body: input.caption.trim(),
            status: DomainPublicationStatus.PUBLISHED,
            publishedAt,
            media: { create: { assetId: asset.id, position: 0 } },
          },
        },
      },
      select: { id: true, communityPost: { select: { id: true } } },
    });
    if (!created.communityPost)
      throw new Error('Community Post creation failed');
    return {
      id: created.communityPost.id,
      engagementTargetId: created.id,
      publishedAt: publishedAt.toISOString(),
    };
  }
}
