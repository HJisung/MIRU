import type { DiscoveryFeed, FeedItem } from "@stream/api-contract";

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

export function getDiscoveryFeed(cursor?: string) {
  const query = new URLSearchParams({ limit: "12" });
  if (cursor) query.set("cursor", cursor);
  return apiFetch<DiscoveryFeed>(`/feed/discovery?${query}`);
}

export function getPost(postId: string) {
  return apiFetch<FeedItem>(`/posts/${encodeURIComponent(postId)}`);
}
