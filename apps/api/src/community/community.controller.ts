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
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CommunityCategoryListDto,
  CommunityPostDto,
  CommunityPostListDto,
  CommunityPostQueryDto,
  CreateCommunityImagePostDto,
} from './community.dto.js';
import { CommunityService } from './community.service.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import type { AuthUser } from '../auth/auth.service.js';
import { PostsService } from '../posts/posts.service.js';

@ApiTags('community')
@Controller()
export class CommunityController {
  constructor(
    @Inject(CommunityService) private readonly community: CommunityService,
    @Inject(PostsService) private readonly legacyPublications: PostsService,
  ) {}

  @Post('community-posts/images')
  @UseGuards(SessionGuard)
  createImage(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateCommunityImagePostDto,
  ) {
    return this.legacyPublications.createCommunityImagePost(user.id, input);
  }

  @Get('community-posts')
  @ApiOperation({ summary: 'List Post Home or one managed Category' })
  @ApiOkResponse({ type: CommunityPostListDto })
  list(@Query() query: CommunityPostQueryDto) {
    return this.community.list(query.category);
  }

  @Get('community-posts/:postId')
  @ApiOperation({ summary: 'View one published Community Post' })
  @ApiOkResponse({ type: CommunityPostDto })
  @ApiNotFoundResponse({
    description: 'Community Post is not published or does not exist',
  })
  findOne(@Param('postId', new ParseUUIDPipe()) id: string) {
    return this.community.findOne(id);
  }

  @Get('community-categories')
  @ApiOperation({ summary: 'List active Community Categories' })
  @ApiOkResponse({ type: CommunityCategoryListDto })
  categories() {
    return this.community.listCategories();
  }
}
