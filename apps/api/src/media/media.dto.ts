import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MediaPurpose, MediaStatus } from '@stream/database';
import { videoUploadPolicy } from '@stream/media';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class CreateImageUploadDto {
  @ApiProperty({ enum: imageTypes })
  @IsIn(imageTypes)
  contentType!: (typeof imageTypes)[number];

  @ApiProperty({ minimum: 1, maximum: 20_000_000 })
  @IsInt()
  @Min(1)
  @Max(20_000_000)
  byteSize!: number;
}

export class UploadSessionDto {
  @ApiProperty({ format: 'uuid' }) assetId!: string;
  @ApiProperty() uploadUrl!: string;
  @ApiProperty() expiresInSeconds!: number;
  @ApiProperty() requiredHeaders!: Record<string, string>;
}

export class CreateVideoUploadDto {
  @ApiProperty({ enum: videoUploadPolicy.mimeTypes })
  @IsIn(videoUploadPolicy.mimeTypes)
  contentType!: (typeof videoUploadPolicy.mimeTypes)[number];

  @ApiProperty({ minimum: 1, maximum: videoUploadPolicy.maxBytes })
  @IsInt()
  @Min(1)
  @Max(videoUploadPolicy.maxBytes)
  byteSize!: number;

  @ApiProperty({
    enum: [MediaPurpose.LONG_VIDEO, MediaPurpose.SHORT_VIDEO],
    default: MediaPurpose.LONG_VIDEO,
  })
  @IsOptional()
  @IsIn([MediaPurpose.LONG_VIDEO, MediaPurpose.SHORT_VIDEO])
  purpose?: 'LONG_VIDEO' | 'SHORT_VIDEO';
}

export class MediaAssetStatusDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: MediaStatus }) status!: MediaStatus;
  @ApiProperty({ nullable: true }) failureCode!: string | null;
  @ApiProperty({ nullable: true }) playbackUrl!: string | null;
  @ApiProperty({ nullable: true }) posterUrl!: string | null;
}
