import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import type { AuthUser } from '../auth/auth.service.js';
import { PublicProfileDto, UpdateProfileDto } from './profiles.dto.js';
import { ProfilesService } from './profiles.service.js';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(
    @Inject(ProfilesService) private readonly profiles: ProfilesService,
  ) {}

  @Get(':handle')
  @ApiOkResponse({ type: PublicProfileDto })
  find(@Param('handle') handle: string) {
    return this.profiles.findByHandle(handle);
  }

  @Patch('me/profile')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: PublicProfileDto })
  update(@CurrentUser() user: AuthUser, @Body() input: UpdateProfileDto) {
    return this.profiles.update(user.id, input);
  }
}
