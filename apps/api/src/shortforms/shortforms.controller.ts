import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import {
  CreateVideoShortformDto,
  ShortformDraftDto,
  ShortformDto,
  ShortformListDto,
} from './shortforms.dto.js';
import { ShortformsService } from './shortforms.service.js';
import type { AuthUser } from '../auth/auth.service.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';

@ApiTags('shortforms')
@Controller('shortforms')
export class ShortformsController {
  constructor(
    @Inject(ShortformsService) private readonly shortforms: ShortformsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List published Shortforms' })
  @ApiOkResponse({ type: ShortformListDto })
  list() {
    return this.shortforms.list();
  }

  @Post('videos')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: ShortformDraftDto })
  createVideo(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateVideoShortformDto,
  ) {
    return this.shortforms.createVideo(user.id, input);
  }

  @Post(':shortformId/publish')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @ApiOkResponse({ type: ShortformDto })
  publish(
    @CurrentUser() user: AuthUser,
    @Param('shortformId', new ParseUUIDPipe()) id: string,
  ) {
    return this.shortforms.publish(user.id, id);
  }

  @Get(':shortformId')
  @ApiOperation({ summary: 'View one published Shortform' })
  @ApiOkResponse({ type: ShortformDto })
  @ApiNotFoundResponse({
    description: 'Shortform is not published or does not exist',
  })
  findOne(@Param('shortformId', new ParseUUIDPipe()) id: string) {
    return this.shortforms.findOne(id);
  }
}
