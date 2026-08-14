import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PostStatus, ReportStatus } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import type { CreateReportDto } from './moderation.dto.js';

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async report(reporterId: string, postId: string, input: CreateReportDto) {
    const post = await this.database.client.post.findFirst({
      where: { id: postId, status: PostStatus.PUBLISHED },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return this.database.client.report.upsert({
      where: { reporterId_postId: { reporterId, postId } },
      create: {
        reporterId,
        postId,
        reason: input.reason,
        details: input.details?.trim() ?? '',
      },
      update: {
        reason: input.reason,
        details: input.details?.trim() ?? '',
        status: ReportStatus.OPEN,
      },
      select: { id: true, status: true, createdAt: true },
    });
  }

  queue() {
    return this.database.client.report.findMany({
      where: { status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] } },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        reporter: { select: { id: true, handle: true } },
        post: { select: { id: true, caption: true, authorId: true } },
      },
    });
  }
}
