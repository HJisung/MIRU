import { Module } from '@nestjs/common';
import { ShortformsController } from './shortforms.controller.js';
import { ShortformsService } from './shortforms.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { MediaModule } from '../media/media.module.js';
import { EngagementTargetModule } from '../engagement/engagement-target.module.js';

@Module({
  imports: [AuthModule, MediaModule, EngagementTargetModule],
  controllers: [ShortformsController],
  providers: [ShortformsService],
})
export class ShortformsModule {}
