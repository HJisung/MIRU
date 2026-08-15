import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PostFormat } from '@stream/database';

export class FeedQuery {
  @ApiPropertyOptional({ enum: PostFormat, enumName: 'PostFormat' })
  @IsOptional()
  @IsEnum(PostFormat)
  format?: PostFormat;

  @ApiPropertyOptional({
    description: 'Opaque cursor returned by the previous page',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 24 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(24)
  @IsOptional()
  limit = 12;
}
