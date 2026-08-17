import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { MediaKind, MediaPurpose, MediaStatus } from '@stream/database';
import { DatabaseService } from '../database/database.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreateImageUploadDto } from './media.dto.js';
import type { CreateVideoUploadDto } from './media.dto.js';
import type { AuthUser } from '../auth/auth.service.js';
import { VideoQueueService } from './video-queue.service.js';

const allowedSignatures = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class MediaService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(VideoQueueService) private readonly videoQueue: VideoQueueService,
  ) {}

  async createImageUpload(userId: string, input: CreateImageUploadDto) {
    const assetId = randomUUID();
    const sourceKey = `originals/${userId}/${assetId}`;
    await this.database.client.mediaAsset.create({
      data: {
        id: assetId,
        ownerId: userId,
        kind: MediaKind.IMAGE,
        purpose: MediaPurpose.POST_IMAGE,
        sourceKey,
        mimeType: input.contentType,
        byteSize: BigInt(input.byteSize),
      },
    });
    const uploadUrl = await this.storage.presignPut(
      sourceKey,
      input.contentType,
      input.byteSize,
    );
    return {
      assetId,
      uploadUrl,
      expiresInSeconds: 600,
      requiredHeaders: { 'content-type': input.contentType },
    };
  }

  async createVideoUpload(userId: string, input: CreateVideoUploadDto) {
    const assetId = randomUUID();
    const sourceKey = `originals/${userId}/${assetId}`;
    await this.database.client.mediaAsset.create({
      data: {
        id: assetId,
        ownerId: userId,
        kind: MediaKind.VIDEO,
        purpose: input.purpose ?? MediaPurpose.LONG_VIDEO,
        sourceKey,
        mimeType: input.contentType,
        byteSize: BigInt(input.byteSize),
      },
    });
    return {
      assetId,
      uploadUrl: await this.storage.presignPut(
        sourceKey,
        input.contentType,
        input.byteSize,
      ),
      expiresInSeconds: 600,
      requiredHeaders: { 'content-type': input.contentType },
    };
  }

  async completeVideo(userId: string, assetId: string) {
    const asset = await this.ownedVideo(userId, assetId);
    if (asset.status === MediaStatus.UPLOADED) {
      await this.videoQueue.enqueue(asset.id);
      return this.statusResult(asset);
    }
    if (
      asset.status === MediaStatus.PROCESSING ||
      asset.status === MediaStatus.READY
    )
      return this.statusResult(asset);
    if (asset.status === MediaStatus.FAILED) {
      const retrying = await this.database.client.mediaAsset.update({
        where: { id: asset.id },
        data: { status: MediaStatus.UPLOADED },
      });
      await this.videoQueue.enqueue(asset.id);
      return this.statusResult(retrying);
    }
    if (asset.status !== MediaStatus.PENDING_UPLOAD)
      throw new BadRequestException(
        'Video cannot be completed in its current state',
      );
    const head = await this.storage.head(asset.sourceKey).catch(() => null);
    if (!head?.ContentLength)
      throw new BadRequestException('Uploaded object not found');
    if (
      asset.byteSize !== null &&
      BigInt(head.ContentLength) !== asset.byteSize
    )
      throw new BadRequestException(
        'Uploaded object size does not match the upload session',
      );
    if (head.ContentType && head.ContentType !== asset.mimeType)
      throw new BadRequestException(
        'Uploaded object content type does not match the upload session',
      );
    const updated = await this.database.client.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: MediaStatus.UPLOADED,
        byteSize: BigInt(head.ContentLength),
      },
    });
    await this.videoQueue.enqueue(asset.id);
    return this.statusResult(updated);
  }

  async status(userId: string, assetId: string) {
    return this.statusResult(await this.ownedVideo(userId, assetId));
  }

  async queueOperations(user: AuthUser) {
    this.assertOperator(user);
    const counts = await this.videoQueue.counts();
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      waitingChildren: counts['waiting-children'] ?? 0,
    };
  }

  async processingOperation(user: AuthUser, assetId: string) {
    this.assertOperator(user);
    const asset = await this.database.client.mediaAsset.findFirst({
      where: { id: assetId, kind: MediaKind.VIDEO },
      select: {
        id: true,
        status: true,
        pipelineVersion: true,
        failureCode: true,
        failureMessage: true,
        processedAt: true,
      },
    });
    if (!asset) throw new NotFoundException('Video asset not found');
    const job = await this.videoQueue.job(asset.id);
    return {
      ...asset,
      processedAt: asset.processedAt?.toISOString() ?? null,
      jobState: job?.state ?? null,
      attemptsMade: job?.attemptsMade ?? 0,
    };
  }

  async retryProcessing(user: AuthUser, assetId: string) {
    this.assertOperator(user);
    const asset = await this.database.client.mediaAsset.findFirst({
      where: { id: assetId, kind: MediaKind.VIDEO, status: MediaStatus.FAILED },
      select: { id: true },
    });
    if (!asset)
      throw new BadRequestException('Only FAILED video assets can be retried');
    await this.videoQueue.enqueue(asset.id);
    return this.processingOperation(user, asset.id);
  }

  async derivedContent(assetId: string, file: string) {
    if (
      !/^(index\.m3u8|master\.m3u8|poster\.jpg|(?:\d{2,4}p)\/(?:index\.m3u8|segment-\d{5}\.ts))$/.test(
        file,
      )
    )
      throw new NotFoundException('Media artifact not found');
    const asset = await this.database.client.mediaAsset.findFirst({
      where: {
        id: assetId,
        status: MediaStatus.READY,
        OR: [
          { homeVideos: { some: { status: 'PUBLISHED' } } },
          {
            seriesSingleWork: {
              some: { publicationStatus: 'PUBLISHED' },
            },
          },
          {
            seriesEpisodes: {
              some: {
                publishedAt: { not: null },
                series: { publicationStatus: 'PUBLISHED' },
              },
            },
          },
          {
            shortFormLinks: {
              some: { shortForm: { status: 'PUBLISHED' } },
            },
          },
        ],
      },
    });
    if (!asset?.hlsManifestKey || !asset.posterKey)
      throw new NotFoundException('Media artifact not found');
    const prefix = asset.hlsManifestKey.slice(
      0,
      asset.hlsManifestKey.lastIndexOf('/'),
    );
    return this.storage.get(`${prefix}/${file}`);
  }

  async completeImage(userId: string, assetId: string) {
    const asset = await this.ownedAsset(userId, assetId);
    if (asset.status === MediaStatus.READY) return this.serialize(asset);
    if (asset.status !== MediaStatus.PENDING_UPLOAD) {
      throw new BadRequestException(
        'Asset cannot be completed in its current state',
      );
    }

    const head = await this.storage.head(asset.sourceKey).catch(() => null);
    if (!head?.ContentLength)
      throw new BadRequestException('Uploaded object not found');
    if (
      asset.byteSize !== null &&
      BigInt(head.ContentLength) !== asset.byteSize
    ) {
      throw new BadRequestException(
        'Uploaded object size does not match the upload session',
      );
    }

    const object = await this.storage.get(asset.sourceKey);
    const bytes = await object.Body?.transformToByteArray();
    const detected = bytes ? await fileTypeFromBuffer(bytes) : undefined;
    if (!detected || !allowedSignatures.has(detected.mime)) {
      await this.database.client.mediaAsset.update({
        where: { id: asset.id },
        data: {
          status: MediaStatus.FAILED,
          failureCode: 'UNSUPPORTED_SIGNATURE',
        },
      });
      throw new BadRequestException('Uploaded object is not a supported image');
    }
    const metadata = await sharp(bytes, {
      failOn: 'warning',
      limitInputPixels: 40_000_000,
    })
      .metadata()
      .catch(() => null);
    if (!metadata?.width || !metadata.height) {
      throw new BadRequestException(
        'Uploaded image could not be decoded safely',
      );
    }

    const completed = await this.database.client.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: MediaStatus.READY,
        mimeType: detected.mime,
        byteSize: BigInt(head.ContentLength),
        width: metadata.width,
        height: metadata.height,
        publicUrl: `/api/v1/media/assets/${asset.id}/content`,
      },
    });
    return this.serialize(completed);
  }

  async content(assetId: string) {
    const asset = await this.database.client.mediaAsset.findFirst({
      where: {
        id: assetId,
        status: MediaStatus.READY,
        postLinks: {
          some: { post: { status: 'PUBLISHED', visibility: 'PUBLIC' } },
        },
      },
    });
    if (!asset) throw new NotFoundException('Media not found');
    return { asset, object: await this.storage.get(asset.sourceKey) };
  }

  private async ownedAsset(userId: string, assetId: string) {
    const asset = await this.database.client.mediaAsset.findFirst({
      where: { id: assetId, ownerId: userId, kind: MediaKind.IMAGE },
    });
    if (!asset) throw new NotFoundException('Media asset not found');
    return asset;
  }

  private async ownedVideo(userId: string, assetId: string) {
    const asset = await this.database.client.mediaAsset.findFirst({
      where: { id: assetId, ownerId: userId, kind: MediaKind.VIDEO },
    });
    if (!asset) throw new NotFoundException('Video asset not found');
    return asset;
  }

  private statusResult(asset: {
    id: string;
    status: MediaStatus;
    failureCode: string | null;
    hlsManifestKey: string | null;
    posterKey: string | null;
    publicUrl: string | null;
  }) {
    return {
      id: asset.id,
      status: asset.status,
      failureCode: asset.failureCode,
      playbackUrl: asset.hlsManifestKey ? asset.publicUrl : null,
      posterUrl: asset.posterKey
        ? `/api/v1/media/assets/${asset.id}/hls/poster.jpg`
        : null,
    };
  }

  private serialize(asset: {
    id: string;
    status: string;
    mimeType: string | null;
    byteSize: bigint | null;
  }) {
    return {
      id: asset.id,
      status: asset.status,
      mimeType: asset.mimeType,
      byteSize: asset.byteSize?.toString() ?? null,
    };
  }

  private assertOperator(user: AuthUser) {
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('Administrator role required');
  }
}
