import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DomainPublicationStatus,
  MediaStatus,
  ModerationTargetStatus,
  PlaylistTargetType,
  PlaylistVisibility,
  SeriesWorkType,
  ShortFormType,
  CommunityPostType,
  type Prisma,
} from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import type {
  AddPlaylistItemDto,
  CreatePlaylistDto,
  UpdatePlaylistDto,
} from './playlists.dto.js';

const include = {
  items: {
    orderBy: { position: 'asc' as const },
    include: {
      homeVideo: { include: { videoAsset: true, engagementTarget: true } },
      series: { include: { singleWorkAsset: true, engagementTarget: true } },
      seriesEpisode: {
        include: {
          videoAsset: true,
          engagementTarget: true,
          series: { include: { engagementTarget: true } },
        },
      },
      shortForm: {
        include: {
          media: { include: { asset: true } },
          engagementTarget: true,
        },
      },
      communityPost: {
        include: {
          media: { include: { asset: true } },
          engagementTarget: true,
        },
      },
    },
  },
} as const;
type PlaylistRecord = Prisma.PlaylistGetPayload<{ include: typeof include }>;

@Injectable()
export class PlaylistsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async create(ownerId: string, input: CreatePlaylistDto) {
    const record = await this.database.client.playlist.create({
      data: {
        ownerId,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        visibility: input.visibility ?? PlaylistVisibility.PRIVATE,
      },
      include,
    });
    return this.map(record);
  }
  async listMine(ownerId: string) {
    const records = await this.database.client.playlist.findMany({
      where: { ownerId },
      include,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return { items: records.map((record) => this.map(record)) };
  }
  async findOwned(ownerId: string, id: string) {
    const record = await this.database.client.playlist.findFirst({
      where: { id, ownerId },
      include,
    });
    if (!record) throw new NotFoundException('Playlist not found');
    return this.map(record);
  }
  async findPublic(id: string) {
    const record = await this.database.client.playlist.findFirst({
      where: {
        id,
        visibility: {
          in: [PlaylistVisibility.PUBLIC, PlaylistVisibility.UNLISTED],
        },
      },
      include,
    });
    if (!record) throw new NotFoundException('Playlist not found');
    return this.map(record);
  }
  async update(ownerId: string, playlistId: string, input: UpdatePlaylistDto) {
    await this.database.client.$transaction(async (tx) => {
      await this.lockOwned(tx, ownerId, playlistId);
      await tx.playlist.update({
        where: { id: playlistId },
        data: {
          ...(input.title !== undefined && { title: input.title.trim() }),
          ...(input.description !== undefined && {
            description: input.description.trim(),
          }),
          ...(input.visibility !== undefined && {
            visibility: input.visibility,
          }),
        },
      });
    });
    return this.findOwned(ownerId, playlistId);
  }
  async delete(ownerId: string, playlistId: string) {
    await this.database.client.$transaction(async (tx) => {
      await this.lockOwned(tx, ownerId, playlistId);
      await tx.playlist.delete({ where: { id: playlistId } });
    });
    return { deleted: true };
  }
  async add(ownerId: string, playlistId: string, input: AddPlaylistItemDto) {
    try {
      await this.database.client.$transaction(async (tx) => {
        await this.lockOwned(tx, ownerId, playlistId);
        await this.assertPlayable(tx, input.type, input.id);
        const last = await tx.playlistItem.aggregate({
          where: { playlistId },
          _max: { position: true },
        });
        await tx.playlistItem.create({
          data: {
            playlistId,
            type: input.type,
            position: (last._max.position ?? 0) + 1,
            ...this.targetData(input.type, input.id),
          },
        });
      });
    } catch (error) {
      if (this.prismaCode(error) === 'P2002')
        throw new ConflictException('Product is already in this Playlist');
      throw error;
    }
    return this.findOwned(ownerId, playlistId);
  }
  async reorder(ownerId: string, playlistId: string, itemIds: string[]) {
    if (new Set(itemIds).size !== itemIds.length)
      throw new BadRequestException('Playlist order contains duplicates');
    await this.database.client.$transaction(async (tx) => {
      await this.lockOwned(tx, ownerId, playlistId);
      const items = await tx.playlistItem.findMany({
        where: { playlistId },
        select: { id: true, position: true },
      });
      const expected = new Set(items.map(({ id }) => id));
      if (
        itemIds.length !== items.length ||
        itemIds.some((id) => !expected.has(id))
      )
        throw new BadRequestException(
          'Playlist order must contain every item exactly once',
        );
      await this.assignOrder(tx, items, itemIds);
    });
    return this.findOwned(ownerId, playlistId);
  }
  async remove(ownerId: string, playlistId: string, itemId: string) {
    await this.database.client.$transaction(async (tx) => {
      await this.lockOwned(tx, ownerId, playlistId);
      const removed = await tx.playlistItem.deleteMany({
        where: { id: itemId, playlistId },
      });
      if (!removed.count)
        throw new NotFoundException('Playlist item not found');
      const items = await tx.playlistItem.findMany({
        where: { playlistId },
        select: { id: true, position: true },
        orderBy: { position: 'asc' },
      });
      await this.assignOrder(
        tx,
        items,
        items.map(({ id }) => id),
      );
    });
    return this.findOwned(ownerId, playlistId);
  }
  private async lockOwned(
    tx: Prisma.TransactionClient,
    ownerId: string,
    playlistId: string,
  ) {
    const rows = await tx.$queryRaw<
      { ownerId: string }[]
    >`SELECT "ownerId" FROM "Playlist" WHERE "id" = ${playlistId}::uuid FOR UPDATE`;
    if (!rows[0]) throw new NotFoundException('Playlist not found');
    if (rows[0].ownerId !== ownerId)
      throw new ForbiddenException('Playlist owner required');
  }
  private async assignOrder(
    tx: Prisma.TransactionClient,
    items: Array<{ id: string; position: number }>,
    ids: string[],
  ) {
    const base =
      Math.max(0, ...items.map(({ position }) => position)) + items.length;
    for (const [index, id] of ids.entries())
      await tx.playlistItem.update({
        where: { id },
        data: { position: base + index + 1 },
      });
    for (const [index, id] of ids.entries())
      await tx.playlistItem.update({
        where: { id },
        data: { position: index + 1 },
      });
  }
  private targetData(type: PlaylistTargetType, id: string) {
    return type === PlaylistTargetType.HOME_VIDEO
      ? { homeVideoId: id }
      : type === PlaylistTargetType.SERIES
        ? { seriesId: id }
        : type === PlaylistTargetType.SERIES_EPISODE
          ? { seriesEpisodeId: id }
          : type === PlaylistTargetType.SHORTFORM
            ? { shortFormId: id }
            : { communityPostId: id };
  }
  private async assertPlayable(
    tx: Prisma.TransactionClient,
    type: PlaylistTargetType,
    id: string,
  ) {
    const commonTarget = { moderationStatus: ModerationTargetStatus.ACTIVE };
    const found =
      type === PlaylistTargetType.HOME_VIDEO
        ? await tx.homeVideo.findFirst({
            where: {
              id,
              status: DomainPublicationStatus.PUBLISHED,
              publishedAt: { not: null },
              videoAsset: { status: MediaStatus.READY },
              engagementTarget: commonTarget,
            },
            select: { id: true },
          })
        : type === PlaylistTargetType.SERIES
          ? await tx.series.findFirst({
              where: {
                id,
                workType: SeriesWorkType.SINGLE_WORK,
                publicationStatus: DomainPublicationStatus.PUBLISHED,
                publishedAt: { not: null },
                singleWorkAsset: { status: MediaStatus.READY },
                engagementTarget: commonTarget,
              },
              select: { id: true },
            })
          : type === PlaylistTargetType.SERIES_EPISODE
            ? await tx.seriesEpisode.findFirst({
                where: {
                  id,
                  publishedAt: { not: null },
                  videoAsset: { status: MediaStatus.READY },
                  engagementTarget: commonTarget,
                  series: {
                    publicationStatus: DomainPublicationStatus.PUBLISHED,
                    engagementTarget: commonTarget,
                  },
                },
                select: { id: true },
              })
            : type === PlaylistTargetType.SHORTFORM
              ? await tx.shortForm.findFirst({
                  where: {
                    id,
                    type: ShortFormType.VIDEO,
                    status: DomainPublicationStatus.PUBLISHED,
                    publishedAt: { not: null },
                    media: { some: { asset: { status: MediaStatus.READY } } },
                    engagementTarget: commonTarget,
                  },
                  select: { id: true },
                })
              : await tx.communityPost.findFirst({
                  where: {
                    id,
                    type: CommunityPostType.VIDEO,
                    status: DomainPublicationStatus.PUBLISHED,
                    publishedAt: { not: null },
                    media: { some: { asset: { status: MediaStatus.READY } } },
                    engagementTarget: commonTarget,
                  },
                  select: { id: true },
                });
    if (!found)
      throw new NotFoundException('Playable public product not found');
  }
  private map(record: PlaylistRecord) {
    return {
      id: record.id,
      title: record.title,
      description: record.description,
      visibility: record.visibility,
      items: record.items.map((item) => {
        const targetId =
          item.homeVideoId ??
          item.seriesId ??
          item.seriesEpisodeId ??
          item.shortFormId ??
          item.communityPostId!;
        const product =
          item.homeVideo ??
          item.series ??
          item.seriesEpisode ??
          item.shortForm ??
          item.communityPost;
        const available = Boolean(product && this.isAvailable(item));
        return {
          id: item.id,
          position: item.position,
          available,
          target: { type: item.type, id: targetId },
          title: available ? this.title(item) : null,
          href: available ? this.href(item.type, targetId) : null,
        };
      }),
    };
  }
  private isAvailable(item: PlaylistRecord['items'][number]) {
    const active = (
      target?: { moderationStatus: ModerationTargetStatus } | null,
    ) => target?.moderationStatus === ModerationTargetStatus.ACTIVE;
    if (item.homeVideo)
      return (
        item.homeVideo.status === DomainPublicationStatus.PUBLISHED &&
        !!item.homeVideo.publishedAt &&
        item.homeVideo.videoAsset?.status === MediaStatus.READY &&
        active(item.homeVideo.engagementTarget)
      );
    if (item.series)
      return (
        item.series.workType === SeriesWorkType.SINGLE_WORK &&
        item.series.publicationStatus === DomainPublicationStatus.PUBLISHED &&
        !!item.series.publishedAt &&
        item.series.singleWorkAsset?.status === MediaStatus.READY &&
        active(item.series.engagementTarget)
      );
    if (item.seriesEpisode)
      return (
        !!item.seriesEpisode.publishedAt &&
        item.seriesEpisode.videoAsset?.status === MediaStatus.READY &&
        item.seriesEpisode.series.publicationStatus ===
          DomainPublicationStatus.PUBLISHED &&
        active(item.seriesEpisode.engagementTarget) &&
        active(item.seriesEpisode.series.engagementTarget)
      );
    if (item.shortForm)
      return (
        item.shortForm.type === ShortFormType.VIDEO &&
        item.shortForm.status === DomainPublicationStatus.PUBLISHED &&
        !!item.shortForm.publishedAt &&
        item.shortForm.media.some(
          ({ asset }) => asset.status === MediaStatus.READY,
        ) &&
        active(item.shortForm.engagementTarget)
      );
    return (
      !!item.communityPost &&
      item.communityPost.type === CommunityPostType.VIDEO &&
      item.communityPost.status === DomainPublicationStatus.PUBLISHED &&
      !!item.communityPost.publishedAt &&
      item.communityPost.media.some(
        ({ asset }) => asset.status === MediaStatus.READY,
      ) &&
      active(item.communityPost.engagementTarget)
    );
  }
  private title(item: PlaylistRecord['items'][number]) {
    return (
      item.homeVideo?.title ??
      item.series?.title ??
      item.seriesEpisode?.title ??
      item.shortForm?.title ??
      item.communityPost?.body.slice(0, 120) ??
      null
    );
  }
  private href(type: PlaylistTargetType, id: string) {
    return type === PlaylistTargetType.HOME_VIDEO
      ? `/watch/home/${id}`
      : type === PlaylistTargetType.SERIES
        ? `/watch/series/${id}`
        : type === PlaylistTargetType.SERIES_EPISODE
          ? `/watch/episode/${id}`
          : type === PlaylistTargetType.SHORTFORM
            ? `/shorts/${id}`
            : `/posts/${id}`;
  }
  private prismaCode(error: unknown) {
    return typeof error === 'object' && error
      ? (error as { code?: unknown }).code
      : undefined;
  }
}
