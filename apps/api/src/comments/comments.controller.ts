import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.service.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import { CreateCommentDto } from './comments.dto.js';
import { CommentsService } from './comments.service.js';
import { EngagementTargetService } from '../engagement/engagement-target.service.js';

@ApiTags('comments')
@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(
    @Inject(CommentsService) private readonly comments: CommentsService,
    @Inject(EngagementTargetService)
    private readonly targets: EngagementTargetService,
  ) {}

  @Get()
  async list(@Param('postId', new ParseUUIDPipe()) postId: string) {
    const target = await this.targets.resolveLegacy(postId);
    return target.nativeTargetId
      ? this.comments.list(target.nativeTargetId)
      : this.comments.listLegacy(target.legacyPostId!);
  }

  @Post()
  @UseGuards(SessionGuard)
  async create(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Body() input: CreateCommentDto,
  ) {
    const target = await this.targets.resolveLegacy(postId);
    return target.nativeTargetId
      ? this.comments.create(user.id, target.nativeTargetId, input.body)
      : this.comments.createLegacy(user.id, target.legacyPostId!, input.body);
  }
}
