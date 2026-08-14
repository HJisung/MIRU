import {
  Inject,
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabaseClient, type DatabaseClient } from '@stream/database';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  readonly client: DatabaseClient;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL must be configured. Copy .env.example to .env.',
      );
    }
    this.client = createDatabaseClient(connectionString);
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onApplicationShutdown() {
    await this.client.$disconnect();
  }
}
