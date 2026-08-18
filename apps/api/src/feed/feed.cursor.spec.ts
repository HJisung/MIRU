import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { decodeFeedCursor, encodeFeedCursor } from './feed.cursor.js';
import { FeedItemType } from './feed.dto.js';

describe('feed cursor', () => {
  it('round-trips the stable sort fields', () => {
    const cursor = {
      publishedAt: new Date('2026-08-15T00:00:00.000Z'),
      type: FeedItemType.HOME_VIDEO,
      id: '30000000-0000-4000-8000-000000000001',
    };
    expect(decodeFeedCursor(encodeFeedCursor(cursor))).toEqual(cursor);
  });

  it('rejects malformed cursors with a public error code', () => {
    expect(() => decodeFeedCursor('not-a-cursor')).toThrow(BadRequestException);
  });
});
