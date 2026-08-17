import { Module } from '@nestjs/common';
import { CommentsModule } from '../comments/comments.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ModerationModule } from '../moderation/moderation.module.js';
import { SocialModule } from '../social/social.module.js';
import { EngagementController } from './engagement.controller.js';
import { EngagementTargetService } from './engagement-target.service.js';

@Module({
  imports: [AuthModule, SocialModule, CommentsModule, ModerationModule],
  controllers: [EngagementController],
  providers: [EngagementTargetService],
  exports: [EngagementTargetService],
})
export class EngagementModule {}
