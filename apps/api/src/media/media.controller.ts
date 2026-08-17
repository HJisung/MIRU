import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import type { AuthUser } from '../auth/auth.service.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import {
  CreateImageUploadDto,
  CreateVideoUploadDto,
  MediaAssetStatusDto,
  UploadSessionDto,
} from './media.dto.js';
import { MediaService } from './media.service.js';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Post('image-uploads')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: UploadSessionDto })
  createUpload(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateImageUploadDto,
  ) {
    return this.media.createImageUpload(user.id, input);
  }

  @Post('video-uploads')
  @UseGuards(SessionGuard)
  @ApiCreatedResponse({ type: UploadSessionDto })
  createVideoUpload(
    @CurrentUser() user: AuthUser,
    @Body() input: CreateVideoUploadDto,
  ) {
    return this.media.createVideoUpload(user.id, input);
  }

  @Post('video-assets/:assetId/complete')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  completeVideo(
    @CurrentUser() user: AuthUser,
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
  ) {
    return this.media.completeVideo(user.id, assetId);
  }

  @Get('video-assets/:assetId/status')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: MediaAssetStatusDto })
  status(
    @CurrentUser() user: AuthUser,
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
  ) {
    return this.media.status(user.id, assetId);
  }

  @Get('assets/:assetId/hls/:file')
  async hls(
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Param('file') file: string,
    @Res() reply: FastifyReply,
  ) {
    const object = await this.media.derivedContent(assetId, file);
    reply.header(
      'Content-Type',
      file.endsWith('.m3u8')
        ? 'application/vnd.apple.mpegurl'
        : file.endsWith('.ts')
          ? 'video/mp2t'
          : 'image/jpeg',
    );
    reply.header('Cache-Control', 'public, max-age=3600');
    return reply.send(object.Body);
  }

  @Post('assets/:assetId/complete')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
  ) {
    return this.media.completeImage(user.id, assetId);
  }

  @Get('assets/:assetId/content')
  async content(
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Res() reply: FastifyReply,
  ) {
    const { asset, object } = await this.media.content(assetId);
    reply.header('Content-Type', asset.mimeType ?? 'application/octet-stream');
    reply.header('Cache-Control', 'public, max-age=3600');
    if (object.ContentLength)
      reply.header('Content-Length', object.ContentLength);
    return reply.send(object.Body);
  }
}
