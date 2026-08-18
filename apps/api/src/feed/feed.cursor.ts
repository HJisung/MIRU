import { BadRequestException } from '@nestjs/common';
import { FeedItemType } from './feed.dto.js';

export interface FeedCursor {
  publishedAt: Date;
  type: FeedItemType;
  id: string;
}
export function encodeFeedCursor(cursor: FeedCursor): string {
  return Buffer.from(
    JSON.stringify({
      v: 2,
      publishedAt: cursor.publishedAt.toISOString(),
      type: cursor.type,
      id: cursor.id,
    }),
  ).toString('base64url');
}
export function decodeFeedCursor(value: string): FeedCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    const publishedAt = new Date(String(parsed.publishedAt));
    if (
      parsed.v !== 2 ||
      !Object.values(FeedItemType).includes(parsed.type as FeedItemType) ||
      Number.isNaN(publishedAt.getTime()) ||
      typeof parsed.id !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(parsed.id)
    )
      throw new Error('Invalid cursor');
    return { publishedAt, type: parsed.type as FeedItemType, id: parsed.id };
  } catch {
    throw new BadRequestException({
      error: { code: 'INVALID_CURSOR', message: 'The feed cursor is invalid.' },
    });
  }
}
