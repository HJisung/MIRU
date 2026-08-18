import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.service.js';
import { ModeratorGuard } from '../auth/moderator.guard.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import {
  CreateReportDto,
  EngagementReportReceiptDto,
  ModerationActionDto,
  ModerationQueueQueryDto,
  ModerationReportDetailDto,
  ModerationReportListDto,
} from './moderation.dto.js';
import { ModerationService } from './moderation.service.js';
import { EngagementTargetService } from '../engagement/engagement-target.service.js';

@ApiTags('moderation')
@Controller('moderation')
export class ModerationController {
  constructor(
    @Inject(ModerationService) private readonly moderation: ModerationService,
    @Inject(EngagementTargetService)
    private readonly targets: EngagementTargetService,
  ) {}

  @Post('posts/:postId/reports')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: EngagementReportReceiptDto })
  async report(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Body() input: CreateReportDto,
  ) {
    const target = await this.targets.resolveLegacy(postId);
    return target.nativeTargetId
      ? this.moderation.report(user.id, target.nativeTargetId, input)
      : this.moderation.reportLegacy(user.id, target.legacyPostId!, input);
  }

  @Get('queue')
  @UseGuards(SessionGuard, ModeratorGuard)
  legacyQueue() {
    return this.moderation.legacyQueue();
  }

  @Get('reports')
  @UseGuards(SessionGuard, ModeratorGuard)
  @ApiOkResponse({ type: ModerationReportListDto })
  queue(@Query() query: ModerationQueueQueryDto) {
    return this.moderation.queue(query);
  }

  @Get('reports/:reportId')
  @UseGuards(SessionGuard, ModeratorGuard)
  @ApiOkResponse({ type: ModerationReportDetailDto })
  detail(@Param('reportId', new ParseUUIDPipe()) reportId: string) {
    return this.moderation.detail(reportId);
  }

  @Post('reports/:reportId/review')
  @UseGuards(SessionGuard, ModeratorGuard)
  @ApiCreatedResponse({ type: ModerationReportDetailDto })
  review(
    @CurrentUser() user: AuthUser,
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
    @Body() input: ModerationActionDto,
  ) {
    return this.moderation.review(user.id, reportId, input.note ?? '');
  }

  @Post('reports/:reportId/dismiss')
  @UseGuards(SessionGuard, ModeratorGuard)
  @ApiCreatedResponse({ type: ModerationReportDetailDto })
  dismiss(
    @CurrentUser() user: AuthUser,
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
    @Body() input: ModerationActionDto,
  ) {
    return this.moderation.dismiss(user.id, reportId, input.note ?? '');
  }

  @Post('reports/:reportId/remove-content')
  @UseGuards(SessionGuard, ModeratorGuard)
  @ApiCreatedResponse({ type: ModerationReportDetailDto })
  removeContent(
    @CurrentUser() user: AuthUser,
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
    @Body() input: ModerationActionDto,
  ) {
    return this.moderation.removeContent(user.id, reportId, input.note ?? '');
  }
}
