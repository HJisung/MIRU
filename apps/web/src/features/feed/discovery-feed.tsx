import type { DiscoveryFeed as DiscoveryFeedData } from "@stream/api-contract";
import { FeedCard } from "./feed-card";

export function DiscoveryFeed({ feed }: { feed: DiscoveryFeedData }) {
  if (feed.items.length === 0) {
    return <div className="rounded-3xl border border-dashed p-12 text-center text-sm text-muted">아직 공개된 게시물이 없습니다.</div>;
  }
  return (
    <section aria-label="추천 게시물" className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {feed.items.map((item, index) => <FeedCard key={item.id} item={item} priority={index < 4} />)}
    </section>
  );
}
