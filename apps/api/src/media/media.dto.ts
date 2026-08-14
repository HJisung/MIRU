import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Max, Min } from 'class-validator';

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
