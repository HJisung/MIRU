import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
