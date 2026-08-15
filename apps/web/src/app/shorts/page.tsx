import { ShortsFeed } from "@/features/feed/shorts-feed";
import { getDiscoveryFeed } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  const feed = await getDiscoveryFeed(undefined, "SHORT_VIDEO");
  return <ShortsFeed feed={feed} />;
}
