import { Module } from '@nestjs/common';
import { SeriesController } from './series.controller.js';
import { SeriesService } from './series.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { MediaModule } from '../media/media.module.js';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [SeriesController],
  providers: [SeriesService],
})
export class SeriesModule {}
