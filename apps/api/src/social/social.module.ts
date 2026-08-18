import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SocialController } from './social.controller.js';
import { SocialService } from './social.service.js';
import { EngagementTargetModule } from '../engagement/engagement-target.module.js';

@Module({
  imports: [AuthModule, EngagementTargetModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
