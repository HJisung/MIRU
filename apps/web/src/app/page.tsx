import { DiscoveryFeed } from "@/features/feed/discovery-feed";
import { getDiscoveryFeed } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const feed = await getDiscoveryFeed();
  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 pb-24 pt-7 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
      <header className="mb-7 flex items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">Curated for today</p><h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">오늘의 발견</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted sm:text-base">잠시 멈춰 볼 만한 사진과 영상, 그리고 오래 남는 이야기를 모았습니다.</p></div>
        <span className="hidden rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-muted sm:block">최신순</span>
      </header>
      <DiscoveryFeed feed={feed} />
    </div>
  );
}
