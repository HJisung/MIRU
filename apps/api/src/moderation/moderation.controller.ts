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
import { ModeratorGuard } from '../auth/moderator.guard.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import { CreateReportDto } from './moderation.dto.js';
import { ModerationService } from './moderation.service.js';

@ApiTags('moderation')
@Controller('moderation')
export class ModerationController {
  constructor(
    @Inject(ModerationService) private readonly moderation: ModerationService,
  ) {}

  @Post('posts/:postId/reports')
  @UseGuards(SessionGuard)
  report(
    @CurrentUser() user: AuthUser,
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Body() input: CreateReportDto,
  ) {
    return this.moderation.report(user.id, postId, input);
  }

  @Get('queue')
  @UseGuards(SessionGuard, ModeratorGuard)
  queue() {
    return this.moderation.queue();
  }
}
