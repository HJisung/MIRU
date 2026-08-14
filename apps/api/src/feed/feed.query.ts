import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FeedQuery {
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
