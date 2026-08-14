import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';
import { ModeratorGuard } from './moderator.guard.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, ModeratorGuard],
  exports: [AuthService, SessionGuard, ModeratorGuard],
})
export class AuthModule {}
