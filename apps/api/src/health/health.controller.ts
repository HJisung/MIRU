import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness check' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  live() {
    return { status: 'ok' as const };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check including PostgreSQL' })
  @ApiOkResponse({ schema: { example: { status: 'ok', database: 'up' } } })
  async ready() {
    try {
      await this.database.client.$queryRaw`SELECT 1`;
      return { status: 'ok' as const, database: 'up' as const };
    } catch {
      throw new ServiceUnavailableException({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'The database is not ready.',
        },
      });
    }
  }
}
