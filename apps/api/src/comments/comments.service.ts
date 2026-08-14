import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PostStatus, PostVisibility } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  list(postId: string) {
    return this.database.client.comment.findMany({
      where: {
        postId,
        post: {
          status: PostStatus.PUBLISHED,
          visibility: PostVisibility.PUBLIC,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async create(userId: string, postId: string, body: string) {
    const post = await this.database.client.post.findFirst({
      where: {
        id: postId,
        status: PostStatus.PUBLISHED,
        visibility: PostVisibility.PUBLIC,
      },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return this.database.client.$transaction(async (transaction) => {
      const comment = await transaction.comment.create({
        data: { authorId: userId, postId, body: body.trim() },
        select: { id: true, body: true, createdAt: true },
      });
      await transaction.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });
      return comment;
    });
  }
}
