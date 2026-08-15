import { ShortsFeed } from "@/features/feed/shorts-feed";
import { getDiscoveryFeed } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  const feed = await getDiscoveryFeed(undefined, "SHORT_VIDEO");
  return <div className="mx-auto max-w-7xl px-4 py-8 pb-20 sm:px-6 lg:px-8"><header className="mb-8"><p className="text-xs font-bold tracking-[0.2em] text-accent">QUICK WATCH</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">숏폼</h1><p className="mt-2 text-sm text-muted">짧고 선명한 순간을 세로 화면으로 만나보세요.</p></header><ShortsFeed feed={feed} /></div>;
}
