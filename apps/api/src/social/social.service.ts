import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus, PostVisibility } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class SocialService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async follow(userId: string, followeeId: string) {
    if (userId === followeeId)
      throw new BadRequestException('You cannot follow yourself');
    await this.assertUser(followeeId);
    await this.database.client.follow.upsert({
      where: { followerId_followeeId: { followerId: userId, followeeId } },
      create: { followerId: userId, followeeId },
      update: {},
    });
    return { following: true };
  }

  async unfollow(userId: string, followeeId: string) {
    await this.database.client.follow.deleteMany({
      where: { followerId: userId, followeeId },
    });
  }

  async like(userId: string, postId: string) {
    await this.assertPost(postId);
    return this.database.client.$transaction(async (transaction) => {
      const existing = await transaction.postLike.findUnique({
        where: { userId_postId: { userId, postId } },
      });
      if (!existing) {
        await transaction.postLike.create({ data: { userId, postId } });
        await transaction.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        });
      }
      const post = await transaction.post.findUniqueOrThrow({
        where: { id: postId },
      });
      return { liked: true, likeCount: post.likeCount };
    });
  }

  async unlike(userId: string, postId: string) {
    return this.database.client.$transaction(async (transaction) => {
      const deleted = await transaction.postLike.deleteMany({
        where: { userId, postId },
      });
      if (deleted.count) {
        await transaction.post.updateMany({
          where: { id: postId, likeCount: { gt: 0 } },
          data: { likeCount: { decrement: 1 } },
        });
      }
      const post = await transaction.post.findUnique({ where: { id: postId } });
      return { liked: false, likeCount: post?.likeCount ?? 0 };
    });
  }

  async save(userId: string, postId: string) {
    await this.assertPost(postId);
    await this.database.client.postSave.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    });
    return { saved: true };
  }

  async unsave(userId: string, postId: string) {
    await this.database.client.postSave.deleteMany({
      where: { userId, postId },
    });
  }

  async block(userId: string, blockedId: string) {
    if (userId === blockedId)
      throw new BadRequestException('You cannot block yourself');
    await this.assertUser(blockedId);
    await this.database.client.$transaction([
      this.database.client.block.upsert({
        where: { blockerId_blockedId: { blockerId: userId, blockedId } },
        create: { blockerId: userId, blockedId },
        update: {},
      }),
      this.database.client.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId, followeeId: blockedId },
            { followerId: blockedId, followeeId: userId },
          ],
        },
      }),
    ]);
    return { blocked: true };
  }

  async unblock(userId: string, blockedId: string) {
    await this.database.client.block.deleteMany({
      where: { blockerId: userId, blockedId },
    });
  }

  private async assertPost(postId: string) {
    const post = await this.database.client.post.findFirst({
      where: {
        id: postId,
        status: PostStatus.PUBLISHED,
        visibility: PostVisibility.PUBLIC,
      },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');
  }

  private async assertUser(userId: string) {
    const user = await this.database.client.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
  }
}
