import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
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
  CreateCommunityLinkPostDto,
  CreateCommunityTextPostDto,
  CreateCommunityVideoPostDto,
  LegacyCreateCommunityImagePostDto,
  LegacyCreateCommunityImagePostResponseDto,
  ManagedCommunityPostDto,
  ManagedCommunityPostListDto,
  UpdateCommunityPostDto,
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

  @Post('community-posts/text')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: CommunityPostDto })
  createText(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateCommunityTextPostDto,
  ) {
    return this.community.createText(user.id, input);
  }

  @Post('community-posts/video')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: CommunityPostDto })
  createVideo(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateCommunityVideoPostDto,
  ) {
    return this.community.createVideo(user.id, input);
  }

  @Post('community-posts/link')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: CommunityPostDto })
  createLink(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateCommunityLinkPostDto,
  ) {
    return this.community.createLink(user.id, input);
  }

  @Post('community-posts/image')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: CommunityPostDto })
  createImageExplicit(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateCommunityImagePostDto,
  ) {
    return this.community.createImage(user.id, input);
  }

  @Post('community-posts/images')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: LegacyCreateCommunityImagePostResponseDto })
  createImage(
    @CurrentUser() user: AuthUser,
    @Body() input: LegacyCreateCommunityImagePostDto,
  ) {
    return this.legacyPublications.createCommunityImagePost(user.id, input);
  }

  @Get('community-posts/mine')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ManagedCommunityPostListDto })
  mine(@CurrentUser() user: AuthUser) {
    return this.community.listMine(user.id);
  }

  @Get('community-posts/:postId/manage')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ManagedCommunityPostDto })
  manage(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) id: string,
  ) {
    return this.community.findManaged(user.id, id);
  }

  @Patch('community-posts/:postId')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ManagedCommunityPostDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateCommunityPostDto,
  ) {
    return this.community.update(user.id, id, input);
  }

  @Post('community-posts/:postId/archive')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: ManagedCommunityPostDto })
  archive(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) id: string,
  ) {
    return this.community.archive(user.id, id);
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
