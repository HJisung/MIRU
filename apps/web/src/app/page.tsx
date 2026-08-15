import { DiscoveryFeed } from "@/features/feed/discovery-feed";
import { getDiscoveryFeed } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const feed = await getDiscoveryFeed(undefined, "LONG_VIDEO");
  return <div className="mx-auto w-full max-w-[1480px] px-4 pb-20 pt-8 sm:px-6 lg:px-8"><header className="mb-8"><p className="text-xs font-bold tracking-[0.2em] text-accent">WATCH</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">오늘 볼 영상</h1><p className="mt-2 text-sm leading-6 text-muted sm:text-base">천천히 몰입해서 볼 수 있는 롱폼 영상만 모았습니다.</p></header><DiscoveryFeed feed={feed} /></div>;
}
