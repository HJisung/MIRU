import { Module } from '@nestjs/common';
import { CommentsModule } from '../comments/comments.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ModerationModule } from '../moderation/moderation.module.js';
import { SocialModule } from '../social/social.module.js';
import { EngagementController } from './engagement.controller.js';
import { EngagementTargetModule } from './engagement-target.module.js';

@Module({
  imports: [
    AuthModule,
    EngagementTargetModule,
    SocialModule,
    CommentsModule,
    ModerationModule,
  ],
  controllers: [EngagementController],
})
export class EngagementModule {}
