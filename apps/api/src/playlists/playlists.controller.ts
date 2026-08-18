import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.service.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import {
  AddPlaylistItemDto,
  CreatePlaylistDto,
  PlaylistDto,
  PlaylistListDto,
  ReorderPlaylistItemsDto,
  UpdatePlaylistDto,
} from './playlists.dto.js';
import { PlaylistsService } from './playlists.service.js';

@ApiTags('playlists')
@Controller('playlists')
export class PlaylistsController {
  constructor(
    @Inject(PlaylistsService) private readonly playlists: PlaylistsService,
  ) {}
  @Post()
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: PlaylistDto })
  create(@CurrentUser() user: AuthUser, @Body() input: CreatePlaylistDto) {
    return this.playlists.create(user.id, input);
  }
  @Get('me')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: PlaylistListDto })
  mine(@CurrentUser() user: AuthUser) {
    return this.playlists.listMine(user.id);
  }
  @Get(':playlistId') @ApiOkResponse({ type: PlaylistDto }) public(
    @Param('playlistId', new ParseUUIDPipe()) id: string,
  ) {
    return this.playlists.findPublic(id);
  }
  @Get(':playlistId/manage')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: PlaylistDto })
  manage(
    @CurrentUser() user: AuthUser,
    @Param('playlistId', new ParseUUIDPipe()) id: string,
  ) {
    return this.playlists.findOwned(user.id, id);
  }
  @Patch(':playlistId')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: PlaylistDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('playlistId', new ParseUUIDPipe()) id: string,
    @Body() input: UpdatePlaylistDto,
  ) {
    return this.playlists.update(user.id, id, input);
  }
  @Delete(':playlistId') @UseGuards(SessionGuard) @ApiOkResponse() delete(
    @CurrentUser() user: AuthUser,
    @Param('playlistId', new ParseUUIDPipe()) id: string,
  ) {
    return this.playlists.delete(user.id, id);
  }
  @Post(':playlistId/items')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: PlaylistDto })
  add(
    @CurrentUser() user: AuthUser,
    @Param('playlistId', new ParseUUIDPipe()) id: string,
    @Body() input: AddPlaylistItemDto,
  ) {
    return this.playlists.add(user.id, id, input);
  }
  @Put(':playlistId/items/order')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: PlaylistDto })
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('playlistId', new ParseUUIDPipe()) id: string,
    @Body() input: ReorderPlaylistItemsDto,
  ) {
    return this.playlists.reorder(user.id, id, input.itemIds);
  }
  @Delete(':playlistId/items/:itemId')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: PlaylistDto })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('playlistId', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ) {
    return this.playlists.remove(user.id, id, itemId);
  }
}
