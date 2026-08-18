import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EngagementTargetType,
  ModerationAuditAction,
  ModerationTargetStatus,
  ReportReason,
  ReportStatus,
} from '@stream/database';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EngagementTargetDto } from '../engagement/engagement.dto.js';
import { CreatorSummaryDto } from '../feed/feed.dto.js';

export class CreateReportDto {
  @ApiProperty({ enum: ReportReason, enumName: 'ReportReason' })
  @IsEnum(ReportReason)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

export class ModerationQueueQueryDto {
  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ enum: EngagementTargetType })
  @IsOptional()
  @IsEnum(EngagementTargetType)
  targetType?: EngagementTargetType;

  @ApiPropertyOptional({ enum: ReportReason })
  @IsOptional()
  @IsEnum(ReportReason)
  reason?: ReportReason;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class ModerationActionDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class EngagementReportReceiptDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ReportStatus }) status!: ReportStatus;
  @ApiProperty() createdAt!: Date;
}

export class ModerationContentDto {
  @ApiPropertyOptional({ type: String, nullable: true }) title!: string | null;
  @ApiProperty() body!: string;
  @ApiProperty({ type: CreatorSummaryDto }) author!: CreatorSummaryDto;
}

export class ModerationAuditEntryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ModerationAuditAction }) action!: ModerationAuditAction;
  @ApiPropertyOptional({ enum: ReportStatus, nullable: true })
  previousStatus!: ReportStatus | null;
  @ApiPropertyOptional({ enum: ReportStatus, nullable: true })
  resultingStatus!: ReportStatus | null;
  @ApiProperty() note!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ type: CreatorSummaryDto }) actor!: CreatorSummaryDto;
}

export class ModerationReportDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ReportReason }) reason!: ReportReason;
  @ApiProperty() details!: string;
  @ApiProperty({ enum: ReportStatus }) status!: ReportStatus;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ type: CreatorSummaryDto }) reporter!: CreatorSummaryDto;
  @ApiProperty({ type: EngagementTargetDto }) target!: EngagementTargetDto;
  @ApiProperty({ enum: ModerationTargetStatus })
  moderationStatus!: ModerationTargetStatus;
  @ApiProperty({ type: () => ModerationContentDto })
  content!: ModerationContentDto;
}

export class ModerationReportListDto {
  @ApiProperty({ type: [ModerationReportDto] }) items!: ModerationReportDto[];
  @ApiProperty({ nullable: true }) nextCursor!: string | null;
}

export class ModerationReportDetailDto extends ModerationReportDto {
  @ApiProperty({ type: () => [ModerationAuditEntryDto] })
  audit!: ModerationAuditEntryDto[];
}
