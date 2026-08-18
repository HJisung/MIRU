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
  homeVideo: ProductTargetRecord | null;
  shortForm: ProductTargetRecord | null;
  seriesEpisode: ProductTargetRecord | null;
  seriesSingleWork: ProductTargetRecord | null;
  episodeNumber: number | null;
  series: {
    id: string;
    title: string;
    _count: { posts: number };
  } | null;
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
      posterKey?: string | null;
    };
  }>;
}

interface ProductTargetRecord {
  id: string;
  engagementTarget: { likeCount: number; commentCount: number } | null;
}

export function toFeedItem(post: FeedPostRecord): FeedItemDto {
  if (!post.publishedAt)
    throw new Error(`Published post ${post.id} has no publishedAt.`);
  const product = post.homeVideo
    ? { type: 'HOME_VIDEO' as const, record: post.homeVideo }
    : post.seriesEpisode
      ? { type: 'SERIES_EPISODE' as const, record: post.seriesEpisode }
      : post.shortForm
        ? { type: 'SHORTFORM' as const, record: post.shortForm }
        : post.seriesSingleWork
          ? { type: 'SERIES' as const, record: post.seriesSingleWork }
          : null;
  return {
    id: post.id,
    format: post.format,
    title: post.title,
    caption: post.caption,
    publishedAt: post.publishedAt.toISOString(),
    likeCount: product?.record.engagementTarget?.likeCount ?? post.likeCount,
    commentCount:
      product?.record.engagementTarget?.commentCount ?? post.commentCount,
    engagementTarget: product
      ? { type: product.type, id: product.record.id }
      : null,
    series:
      post.series && post.episodeNumber
        ? {
            id: post.series.id,
            title: post.series.title,
            episodeNumber: post.episodeNumber,
            episodeCount: post.series._count.posts,
          }
        : null,
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
        posterUrl: asset.posterKey
          ? `/api/v1/media/assets/${asset.id}/hls/poster.jpg`
          : null,
      };
    }),
  };
}
