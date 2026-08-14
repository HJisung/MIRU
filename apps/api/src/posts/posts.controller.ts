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
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FeedItemDto } from '../feed/feed.dto.js';
import { PostsService } from './posts.service.js';
import { CreateImagePostDto } from './posts.dto.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import type { AuthUser } from '../auth/auth.service.js';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(@Inject(PostsService) private readonly posts: PostsService) {}

  @Post('images')
  @UseGuards(SessionGuard)
  createImagePost(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateImagePostDto,
  ) {
    return this.posts.createImagePost(user.id, input);
  }

  @Get(':postId')
  @ApiOperation({ summary: 'View one public published post' })
  @ApiOkResponse({ type: FeedItemDto })
  @ApiNotFoundResponse({ description: 'Post does not exist or is not public' })
  findOne(@Param('postId', new ParseUUIDPipe()) postId: string) {
    return this.posts.findPublished(postId);
  }
}
