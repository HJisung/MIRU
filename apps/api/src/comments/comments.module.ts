import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';
import { EngagementTargetModule } from '../engagement/engagement-target.module.js';

@Module({
  imports: [AuthModule, EngagementTargetModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
