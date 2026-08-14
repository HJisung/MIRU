import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Stream Platform API')
    .setDescription('Public and authenticated media platform operations')
    .setVersion('1.0')
    .build();

  return SwaggerModule.createDocument(app, config);
}
