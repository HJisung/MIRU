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

@ApiTags('comments')
@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(
    @Inject(CommentsService) private readonly comments: CommentsService,
  ) {}

  @Get()
  list(@Param('postId', new ParseUUIDPipe()) postId: string) {
    return this.comments.list(postId);
  }

  @Post()
  @UseGuards(SessionGuard)
  create(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Body() input: CreateCommentDto,
  ) {
    return this.comments.create(user.id, postId, input.body);
  }
}
