import { LongformList } from "@/features/feed/longform-list";
import { getDiscoveryFeed } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const feed = await getDiscoveryFeed(undefined, "LONG_VIDEO");
  return <div className="mx-auto w-full max-w-[112rem] px-4 pb-20 pt-7 sm:px-6 lg:px-10"><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.2em] text-accent">LONGFORM</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">깊게 보는 이야기</h1><p className="mt-2 text-sm text-muted">한 편으로 완결되는 작품과 이어지는 시리즈를 만나보세요.</p></div><div className="flex gap-2"><button className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">전체</button><button className="rounded-full bg-panel px-4 py-2 text-xs font-semibold text-muted">한 편 완결</button><button className="rounded-full bg-panel px-4 py-2 text-xs font-semibold text-muted">시리즈</button></div></header><LongformList feed={feed} /></div>;
}
