import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller.js';
import { CommunityService } from './community.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { MediaModule } from '../media/media.module.js';
import { PostsModule } from '../posts/posts.module.js';

@Module({
  imports: [AuthModule, MediaModule, PostsModule],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
