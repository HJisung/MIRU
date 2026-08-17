import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.service.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import { CommentsService } from '../comments/comments.service.js';
import { CreateCommentDto } from '../comments/comments.dto.js';
import { CreateReportDto } from '../moderation/moderation.dto.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { SocialService } from '../social/social.service.js';
import { EngagementTargetService } from './engagement-target.service.js';
import { EngagementTargetType } from './engagement.dto.js';

@ApiTags('engagement')
@Controller('engagement/:targetType/:targetId')
export class EngagementController {
  constructor(
    @Inject(EngagementTargetService)
    private readonly targets: EngagementTargetService,
    @Inject(SocialService) private readonly social: SocialService,
    @Inject(CommentsService) private readonly comments: CommentsService,
    @Inject(ModerationService) private readonly moderation: ModerationService,
  ) {}

  private resolve(type: EngagementTargetType, id: string) {
    return this.targets.resolve(type, id);
  }

  @Put('like')
  @UseGuards(SessionGuard)
  async like(
    @CurrentUser() user: AuthUser,
    @Param('targetType', new ParseEnumPipe(EngagementTargetType))
    type: EngagementTargetType,
    @Param('targetId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.like(user.id, await this.resolve(type, id));
  }

  @Delete('like')
  @UseGuards(SessionGuard)
  async unlike(
    @CurrentUser() user: AuthUser,
    @Param('targetType', new ParseEnumPipe(EngagementTargetType))
    type: EngagementTargetType,
    @Param('targetId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.unlike(user.id, await this.resolve(type, id));
  }

  @Put('save')
  @UseGuards(SessionGuard)
  async save(
    @CurrentUser() user: AuthUser,
    @Param('targetType', new ParseEnumPipe(EngagementTargetType))
    type: EngagementTargetType,
    @Param('targetId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.save(user.id, await this.resolve(type, id));
  }

  @Delete('save')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async unsave(
    @CurrentUser() user: AuthUser,
    @Param('targetType', new ParseEnumPipe(EngagementTargetType))
    type: EngagementTargetType,
    @Param('targetId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.unsave(user.id, await this.resolve(type, id));
  }

  @Get('comments')
  async listComments(
    @Param('targetType', new ParseEnumPipe(EngagementTargetType))
    type: EngagementTargetType,
    @Param('targetId', new ParseUUIDPipe()) id: string,
  ) {
    return this.comments.list(await this.resolve(type, id));
  }

  @Post('comments')
  @UseGuards(SessionGuard)
  async comment(
    @CurrentUser() user: AuthUser,
    @Param('targetType', new ParseEnumPipe(EngagementTargetType))
    type: EngagementTargetType,
    @Param('targetId', new ParseUUIDPipe()) id: string,
    @Body() input: CreateCommentDto,
  ) {
    return this.comments.create(
      user.id,
      await this.resolve(type, id),
      input.body,
    );
  }

  @Post('reports')
  @UseGuards(SessionGuard)
  async report(
    @CurrentUser() user: AuthUser,
    @Param('targetType', new ParseEnumPipe(EngagementTargetType))
    type: EngagementTargetType,
    @Param('targetId', new ParseUUIDPipe()) id: string,
    @Body() input: CreateReportDto,
  ) {
    return this.moderation.report(user.id, await this.resolve(type, id), input);
  }
}
