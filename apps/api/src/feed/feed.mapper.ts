import { SeriesWorkType } from '@stream/database';
import { toPlayableMedia } from '../playback/playback.mapper.js';
import { FeedItemType, type FeedItemDto } from './feed.dto.js';

export const feedTypeRank: Record<FeedItemType, number> = {
  HOME_VIDEO: 4,
  SERIES: 3,
  SERIES_EPISODE: 2,
  SHORTFORM: 1,
};
type Creator = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
};
type Target = { likeCount: number; commentCount: number };
type Asset = Parameters<typeof toPlayableMedia>[0];

function media(asset: Asset) {
  const mapped = toPlayableMedia(asset);
  if (!mapped) throw new Error('Published feed media is not displayable');
  return mapped;
}
export function toHomeFeedItem(r: {
  id: string;
  title: string;
  description: string;
  publishedAt: Date | null;
  creator: Creator;
  videoAsset: Asset;
  engagementTarget: Target | null;
}): FeedItemDto {
  return base(
    FeedItemType.HOME_VIDEO,
    r.id,
    r.title,
    r.description,
    r.publishedAt,
    r.creator,
    r.engagementTarget,
    [media(r.videoAsset)],
    null,
  );
}
export function toSeriesFeedItem(r: {
  id: string;
  title: string;
  synopsis: string;
  workType: SeriesWorkType;
  publishedAt: Date | null;
  creator: Creator;
  singleWorkAsset: Asset;
  engagementTarget: Target | null;
}): FeedItemDto {
  if (r.workType !== SeriesWorkType.SINGLE_WORK)
    throw new Error('Only SINGLE_WORK Series belongs in discovery');
  return base(
    FeedItemType.SERIES,
    r.id,
    r.title,
    r.synopsis,
    r.publishedAt,
    r.creator,
    r.engagementTarget,
    [media(r.singleWorkAsset)],
    null,
  );
}
export function toEpisodeFeedItem(r: {
  id: string;
  title: string;
  synopsis: string;
  episodeNumber: number;
  publishedAt: Date | null;
  videoAsset: Asset;
  engagementTarget: Target | null;
  series: {
    id: string;
    title: string;
    creator: Creator;
    _count: { episodes: number };
  };
}): FeedItemDto {
  return base(
    FeedItemType.SERIES_EPISODE,
    r.id,
    r.title,
    r.synopsis,
    r.publishedAt,
    r.series.creator,
    r.engagementTarget,
    [media(r.videoAsset)],
    {
      id: r.series.id,
      title: r.series.title,
      episodeNumber: r.episodeNumber,
      episodeCount: r.series._count.episodes,
    },
  );
}
export function toShortformFeedItem(r: {
  id: string;
  title: string | null;
  description: string;
  publishedAt: Date | null;
  creator: Creator;
  engagementTarget: Target | null;
  media: Array<{ asset: Asset }>;
}): FeedItemDto {
  return base(
    FeedItemType.SHORTFORM,
    r.id,
    r.title,
    r.description,
    r.publishedAt,
    r.creator,
    r.engagementTarget,
    r.media.map(({ asset }) => media(asset)),
    null,
  );
}
function base(
  type: FeedItemType,
  id: string,
  title: string | null,
  caption: string,
  publishedAt: Date | null,
  author: Creator,
  target: Target | null,
  mediaItems: FeedItemDto['media'],
  series: FeedItemDto['series'],
): FeedItemDto {
  if (!publishedAt)
    throw new Error(`Published ${type} ${id} has no publishedAt`);
  if (!target)
    throw new Error(`Published ${type} ${id} has no EngagementTarget`);
  return {
    id,
    type,
    title,
    caption,
    publishedAt: publishedAt.toISOString(),
    likeCount: target.likeCount,
    commentCount: target.commentCount,
    engagementTarget: { type, id },
    author,
    media: mediaItems,
    series,
  };
}
