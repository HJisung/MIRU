import { Module } from '@nestjs/common';
import { ShortformsController } from './shortforms.controller.js';
import { ShortformsService } from './shortforms.service.js';

@Module({ controllers: [ShortformsController], providers: [ShortformsService] })
export class ShortformsModule {}
