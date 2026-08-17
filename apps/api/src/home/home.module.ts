import { Module } from '@nestjs/common';
import { HomeController } from './home.controller.js';
import { HomeService } from './home.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { MediaModule } from '../media/media.module.js';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
