import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaylistTargetType, PlaylistVisibility } from '@stream/database';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlaylistDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) title!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
  @ApiPropertyOptional({
    enum: PlaylistVisibility,
    default: PlaylistVisibility.PRIVATE,
  })
  @IsOptional()
  @IsEnum(PlaylistVisibility)
  visibility?: PlaylistVisibility;
}
export class UpdatePlaylistDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: PlaylistVisibility })
  @IsOptional()
  @IsEnum(PlaylistVisibility)
  visibility?: PlaylistVisibility;
}
export class AddPlaylistItemDto {
  @ApiProperty({ enum: PlaylistTargetType })
  @IsEnum(PlaylistTargetType)
  type!: PlaylistTargetType;
  @ApiProperty({ format: 'uuid' }) @IsUUID() id!: string;
}
export class ReorderPlaylistItemsDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds!: string[];
}
export class PlaylistTargetDto {
  @ApiProperty({ enum: PlaylistTargetType }) type!: PlaylistTargetType;
  @ApiProperty({ format: 'uuid' }) id!: string;
}
export class PlaylistItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() position!: number;
  @ApiProperty() available!: boolean;
  @ApiProperty({ type: PlaylistTargetDto }) target!: PlaylistTargetDto;
  @ApiPropertyOptional({ type: String, nullable: true }) title!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) href!: string | null;
}
export class PlaylistDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: PlaylistVisibility }) visibility!: PlaylistVisibility;
  @ApiProperty({ type: [PlaylistItemDto] }) items!: PlaylistItemDto[];
}
export class PlaylistListDto {
  @ApiProperty({ type: [PlaylistDto] }) items!: PlaylistDto[];
}
