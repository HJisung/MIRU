import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller.js';
import { CommunityService } from './community.service.js';
import { PostsModule } from '../posts/posts.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule, PostsModule],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
