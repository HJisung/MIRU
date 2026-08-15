import { LongformList } from "@/features/feed/longform-list";
import Image from "next/image";
import Link from "next/link";
import { ListVideo } from "lucide-react";
import { getCollections, getHomeVideos } from "@/lib/api";
import { mediaUrl } from "@/lib/client-api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [feed, collections] = await Promise.all([getHomeVideos(), getCollections()]);
  return <div className="mx-auto w-full max-w-[112rem] px-4 pb-20 pt-7 sm:px-6 lg:px-10"><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.2em] text-muted">HOME</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">오늘 볼 영상</h1><p className="mt-2 text-sm text-muted">한 편으로 완결되는 MIRU의 기본 영상입니다.</p></div><div className="flex gap-2"><span className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Single</span><span className="rounded-full bg-panel px-4 py-2 text-xs font-semibold text-muted">Collection</span></div></header><LongformList feed={feed} />{collections.items.length > 0 && <section className="mt-16 border-t border-line pt-9"><div className="mb-5"><p className="text-xs font-bold tracking-[0.18em] text-muted">COLLECTION</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">함께 이어 보는 영상</h2><p className="mt-2 text-sm text-muted">제작자가 기존 Single을 순서대로 묶은 공개 모음입니다.</p></div><div className="grid gap-5 lg:grid-cols-2">{collections.items.map((collection) => { const first = collection.items[0]?.video; const media = first?.publication.media[0]; return <article key={collection.id} className="grid gap-4 rounded-3xl border border-line bg-panel-strong p-4 sm:grid-cols-[16rem_1fr]">{media && first && <Link href={`/watch/${first.id}`} className="relative aspect-video overflow-hidden rounded-2xl bg-black"><Image src={mediaUrl(media.url)} unoptimized={media.url.startsWith("/api/")} alt={collection.title} fill sizes="256px" className="object-cover" /><span className="absolute bottom-3 right-3 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-[11px] text-white"><ListVideo className="size-3.5" />{collection.items.length}개 영상</span></Link>}<div className="py-1"><h3 className="text-lg font-semibold">{collection.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{collection.description}</p><p className="mt-4 text-xs text-muted">{collection.owner.displayName}의 공개 Collection</p></div></article>; })}</div></section>}</div>;
}
