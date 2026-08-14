import type { PostFormat } from '@stream/database';
import type { FeedItemDto } from './feed.dto.js';

interface FeedPostRecord {
  id: string;
  format: PostFormat;
  title: string | null;
  caption: string;
  publishedAt: Date | null;
  likeCount: number;
  commentCount: number;
  author: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
  };
  media: Array<{
    asset: {
      id: string;
      publicUrl: string | null;
      mimeType: string | null;
      width: number | null;
      height: number | null;
      durationMs: number | null;
    };
  }>;
}

export function toFeedItem(post: FeedPostRecord): FeedItemDto {
  if (!post.publishedAt)
    throw new Error(`Published post ${post.id} has no publishedAt.`);
  return {
    id: post.id,
    format: post.format,
    title: post.title,
    caption: post.caption,
    publishedAt: post.publishedAt.toISOString(),
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    author: post.author,
    media: post.media.map(({ asset }) => {
      if (
        !asset.publicUrl ||
        !asset.mimeType ||
        !asset.width ||
        !asset.height
      ) {
        throw new Error(`Ready media ${asset.id} is missing display metadata.`);
      }
      return {
        id: asset.id,
        url: asset.publicUrl,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        durationMs: asset.durationMs,
      };
    }),
  };
}
