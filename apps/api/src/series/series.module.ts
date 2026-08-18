import { Module } from '@nestjs/common';
import {
  SeriesAdminController,
  SeriesController,
} from './series.controller.js';
import { SeriesService } from './series.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { MediaModule } from '../media/media.module.js';
import { EngagementTargetModule } from '../engagement/engagement-target.module.js';

@Module({
  imports: [AuthModule, MediaModule, EngagementTargetModule],
  controllers: [SeriesController, SeriesAdminController],
  providers: [SeriesService],
})
export class SeriesModule {}
