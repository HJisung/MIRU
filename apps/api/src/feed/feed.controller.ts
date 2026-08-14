import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiscoveryFeedDto } from './feed.dto.js';
import { FeedQuery } from './feed.query.js';
import { FeedService } from './feed.service.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import type { AuthUser } from '../auth/auth.service.js';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(@Inject(FeedService) private readonly feed: FeedService) {}

  @Get('discovery')
  @ApiOperation({ summary: 'Browse public posts using a stable cursor' })
  @ApiOkResponse({ type: DiscoveryFeedDto })
  discover(@Query() query: FeedQuery) {
    return this.feed.discover(query);
  }

  @Get('following')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Browse posts from followed creators' })
  @ApiOkResponse({ type: DiscoveryFeedDto })
  following(@CurrentUser() user: AuthUser, @Query() query: FeedQuery) {
    return this.feed.following(user.id, query);
  }
}
