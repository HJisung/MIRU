import { ShortsFeed } from "@/features/feed/shorts-feed";
import { getShortforms } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  const feed = await getShortforms();
  return <ShortsFeed feed={feed} />;
}
