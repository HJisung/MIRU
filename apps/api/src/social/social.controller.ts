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
import { EngagementTargetService } from '../engagement/engagement-target.service.js';

@ApiTags('social')
@UseGuards(SessionGuard)
@Controller()
export class SocialController {
  constructor(
    @Inject(SocialService) private readonly social: SocialService,
    @Inject(EngagementTargetService)
    private readonly targets: EngagementTargetService,
  ) {}

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
  async like(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) id: string,
  ) {
    const target = await this.targets.resolveLegacy(id);
    return target.nativeTargetId
      ? this.social.like(user.id, target.nativeTargetId)
      : this.social.likeLegacy(user.id, target.legacyPostId!);
  }

  @Delete('posts/:postId/like')
  async unlike(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) id: string,
  ) {
    const target = await this.targets.resolveLegacy(id);
    return target.nativeTargetId
      ? this.social.unlike(user.id, target.nativeTargetId)
      : this.social.unlikeLegacy(user.id, target.legacyPostId!);
  }

  @Put('posts/:postId/save')
  async save(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) id: string,
  ) {
    const target = await this.targets.resolveLegacy(id);
    return target.nativeTargetId
      ? this.social.save(user.id, target.nativeTargetId)
      : this.social.saveLegacy(user.id, target.legacyPostId!);
  }

  @Delete('posts/:postId/save')
  @HttpCode(204)
  async unsave(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) id: string,
  ) {
    const target = await this.targets.resolveLegacy(id);
    return target.nativeTargetId
      ? this.social.unsave(user.id, target.nativeTargetId)
      : this.social.unsaveLegacy(user.id, target.legacyPostId!);
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
