import Link from "next/link";
import { PostTimeline } from "@/features/feed/post-timeline";
import { getDiscoveryFeed } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const feed = await getDiscoveryFeed(undefined, "IMAGE");
  return <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 pb-20 sm:px-6 lg:grid-cols-[minmax(0,44rem)_18rem] lg:px-8"><main><header className="mb-6"><p className="text-xs font-bold tracking-[0.2em] text-accent">COMMUNITY</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">포스트</h1><p className="mt-2 text-sm text-muted">사진과 생각을 나누고 대화를 이어가는 공간입니다.</p></header><PostTimeline feed={feed} /></main><aside className="hidden lg:block"><div className="sticky top-24 rounded-2xl border border-line bg-panel-strong p-5"><h2 className="font-semibold">포스트 안내</h2><p className="mt-2 text-sm leading-6 text-muted">가벼운 근황, 질문, 사진 기록을 올려보세요. 좋은 대화가 이어질 수 있도록 서로를 존중해 주세요.</p><Link href="/create" className="mt-5 block rounded-xl bg-ink px-4 py-3 text-center text-sm font-semibold text-white">새 포스트 작성</Link></div></aside></div>;
}
