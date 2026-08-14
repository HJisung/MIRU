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
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import type { AuthUser } from '../auth/auth.service.js';
import { CurrentUser, SessionGuard } from '../auth/session.guard.js';
import { CreateImageUploadDto, UploadSessionDto } from './media.dto.js';
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
