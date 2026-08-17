import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DomainPublicationStatus } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { EngagementTargetType } from './engagement.dto.js';

/** Resolves a public product identity to temporary legacy engagement storage. */
@Injectable()
export class EngagementTargetService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async resolve(type: EngagementTargetType, id: string): Promise<string> {
    const published = DomainPublicationStatus.PUBLISHED;
    let record: { publicationId: string } | null = null;
    switch (type) {
      case EngagementTargetType.HOME_VIDEO:
        record = await this.database.client.homeVideo.findFirst({
          where: { id, status: published },
          select: { publicationId: true },
        });
        break;
      case EngagementTargetType.SERIES:
        record = await this.database.client.series
          .findFirst({
            where: { id, publicationStatus: published },
            select: { singleWorkPublicationId: true },
          })
          .then((series) =>
            series?.singleWorkPublicationId
              ? { publicationId: series.singleWorkPublicationId }
              : null,
          );
        break;
      case EngagementTargetType.SERIES_EPISODE:
        record = await this.database.client.seriesEpisode.findFirst({
          where: {
            id,
            publishedAt: { not: null },
            series: { publicationStatus: published },
          },
          select: { publicationId: true },
        });
        break;
      case EngagementTargetType.SHORTFORM:
        record = await this.database.client.shortForm.findFirst({
          where: { id, status: published },
          select: { publicationId: true },
        });
        break;
      case EngagementTargetType.COMMUNITY_POST:
        record = await this.database.client.communityPost.findFirst({
          where: { id, status: published },
          select: { publicationId: true },
        });
        break;
    }
    if (!record) throw new NotFoundException('Engagement target not found');
    return record.publicationId;
  }
}
