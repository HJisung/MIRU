import type { DiscoveryFeed as DiscoveryFeedData } from "@stream/api-contract";
import { Layers3, Play, TimerReset } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/client-api";
import { duration, relativeDate } from "@/lib/format";

export function LongformList({ feed }: { feed: DiscoveryFeedData }) {
  return <div className="space-y-7">{feed.items.map((item) => {
    const media = item.media[0]; if (!media) return null;
    return <article key={item.id} className="group grid gap-4 sm:grid-cols-[minmax(20rem,42rem)_minmax(0,1fr)]">
      <Link href={`/watch/${item.id}`} className="relative block aspect-video overflow-hidden rounded-2xl bg-black"><Image src={mediaUrl(media.url)} unoptimized={media.url.startsWith("/api/")} alt={item.title ?? item.caption} fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover transition duration-500 group-hover:scale-[1.015]" /><span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 text-xs font-semibold text-white"><Play className="size-3 fill-current" />{duration(media.durationMs ?? null)}</span>{item.series && <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"><Layers3 className="size-3.5" /> 시리즈</span>}</Link>
      <div className="min-w-0 py-1"><Link href={`/watch/${item.id}`} className="text-xl font-semibold leading-7 tracking-[-0.025em] hover:underline">{item.title ?? item.caption}</Link><p className="mt-2 text-sm text-muted">{item.author.displayName} · {relativeDate(item.publishedAt)}</p><p className="mt-4 line-clamp-2 max-w-2xl text-sm leading-6 text-muted">{item.caption}</p>
        {item.series ? <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-line bg-panel px-3.5 py-2.5"><Layers3 className="size-4 text-accent" /><span><strong className="block text-sm">{item.series.title}</strong><span className="text-xs text-muted">EP.{item.series.episodeNumber} · 총 {item.series.episodeCount}편</span></span></div> : <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted"><TimerReset className="size-3.5" /> 한 편 완결</div>}
      </div>
    </article>;
  })}</div>;
}
