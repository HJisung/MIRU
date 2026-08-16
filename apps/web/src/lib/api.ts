import type {
  FeedItem,
  HomeVideo,
  HomeVideoList,
  CollectionList,
  Series,
  SeriesList,
  Shortform,
  ShortformList,
  CommunityCategoryList,
  CommunityPost,
  CommunityPostList,
} from "@stream/api-contract";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    next: { revalidate: 30, ...init?.next },
  });
  if (!response.ok)
    throw new ApiError(
      response.status,
      `API request failed: ${response.status}`,
    );
  return response.json() as Promise<T>;
}

export function getPost(postId: string) {
  return apiFetch<FeedItem>(`/posts/${encodeURIComponent(postId)}`);
}

export function getHomeVideos() {
  return apiFetch<HomeVideoList>("/home/videos");
}

export function getHomeVideo(videoId: string) {
  return apiFetch<HomeVideo>(`/home/videos/${encodeURIComponent(videoId)}`);
}

export function getCollections() {
  return apiFetch<CollectionList>("/home/collections");
}

export function getSeriesList() {
  return apiFetch<SeriesList>("/series");
}

export function getSeries(seriesId: string) {
  return apiFetch<Series>(`/series/${encodeURIComponent(seriesId)}`);
}

export function getShortforms() {
  return apiFetch<ShortformList>("/shortforms");
}

export function getShortform(shortformId: string) {
  return apiFetch<Shortform>(`/shortforms/${encodeURIComponent(shortformId)}`);
}

export function getCommunityCategories() {
  return apiFetch<CommunityCategoryList>("/community-categories");
}

export function getCommunityPosts(category?: string) {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch<CommunityPostList>(`/community-posts${query}`);
}

export function getCommunityPost(postId: string) {
  return apiFetch<CommunityPost>(
    `/community-posts/${encodeURIComponent(postId)}`,
  );
}
