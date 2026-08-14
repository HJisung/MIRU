import { BadRequestException } from '@nestjs/common';

export interface FeedCursor {
  publishedAt: Date;
  id: string;
}

export function encodeFeedCursor(cursor: FeedCursor): string {
  return Buffer.from(
    JSON.stringify({
      publishedAt: cursor.publishedAt.toISOString(),
      id: cursor.id,
    }),
  ).toString('base64url');
}

export function decodeFeedCursor(value: string): FeedCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as {
      publishedAt?: unknown;
      id?: unknown;
    };
    if (
      typeof parsed.publishedAt !== 'string' ||
      typeof parsed.id !== 'string'
    ) {
      throw new Error('Missing cursor fields');
    }
    const publishedAt = new Date(parsed.publishedAt);
    if (
      Number.isNaN(publishedAt.getTime()) ||
      !/^[0-9a-f-]{36}$/i.test(parsed.id)
    ) {
      throw new Error('Invalid cursor fields');
    }
    return { publishedAt, id: parsed.id };
  } catch {
    throw new BadRequestException({
      error: { code: 'INVALID_CURSOR', message: 'The feed cursor is invalid.' },
    });
  }
}
