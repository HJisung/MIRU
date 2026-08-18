import { Module } from '@nestjs/common';
import { EngagementTargetService } from './engagement-target.service.js';

@Module({
  providers: [EngagementTargetService],
  exports: [EngagementTargetService],
})
export class EngagementTargetModule {}
