import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../app.module.js';
import { createOpenApiDocument } from './openapi.js';

async function exportOpenApi() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { abortOnError: false },
  );
  app.setGlobalPrefix('api/v1');

  const output = resolve(
    process.cwd(),
    '../../packages/api-contract/openapi.json',
  );
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(
    output,
    `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`,
  );
  await app.close();
  console.log(`OpenAPI written to ${output}`);
}

exportOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
