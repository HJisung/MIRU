import {
  Controller,
  Delete,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.service.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import { SocialService } from './social.service.js';

@ApiTags('social')
@UseGuards(SessionGuard)
@Controller()
export class SocialController {
  constructor(@Inject(SocialService) private readonly social: SocialService) {}

  @Put('users/:userId/follow')
  follow(
    @CurrentUser() user: AuthUser,
    @Param('userId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.follow(user.id, id);
  }

  @Delete('users/:userId/follow')
  @HttpCode(204)
  unfollow(
    @CurrentUser() user: AuthUser,
    @Param('userId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.unfollow(user.id, id);
  }

  @Put('posts/:postId/like')
  like(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.like(user.id, id);
  }

  @Delete('posts/:postId/like')
  unlike(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.unlike(user.id, id);
  }

  @Put('posts/:postId/save')
  save(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.save(user.id, id);
  }

  @Delete('posts/:postId/save')
  @HttpCode(204)
  unsave(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.unsave(user.id, id);
  }

  @Put('users/:userId/block')
  block(
    @CurrentUser() user: AuthUser,
    @Param('userId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.block(user.id, id);
  }

  @Delete('users/:userId/block')
  @HttpCode(204)
  unblock(
    @CurrentUser() user: AuthUser,
    @Param('userId', new ParseUUIDPipe()) id: string,
  ) {
    return this.social.unblock(user.id, id);
  }
}
