import type { DiscoveryFeed as DiscoveryFeedData } from "@stream/api-contract";
import { Heart, MessageCircle, Play, Share2 } from "lucide-react";
import Image from "next/image";
import { mediaUrl } from "@/lib/client-api";
import { compactNumber, duration } from "@/lib/format";

export function ShortsFeed({ feed }: { feed: DiscoveryFeedData }) {
  return <div className="h-[calc(100vh-4rem)] snap-y snap-mandatory overflow-y-auto bg-black">{feed.items.map((item) => { const media = item.media[0]; if (!media) return null; return <article key={item.id} className="relative mx-auto flex min-h-full w-full snap-start items-center justify-center bg-black"><div className="relative h-[calc(100vh-5.5rem)] max-h-[60rem] w-full max-w-[34rem] overflow-hidden bg-neutral-950 sm:rounded-2xl"><Image src={mediaUrl(media.url)} unoptimized={media.url.startsWith("/api/")} alt={item.caption} fill priority className="object-cover" sizes="544px" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" /><button aria-label="재생" className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm"><Play className="ml-1 size-7 fill-current" /></button><span className="absolute left-4 top-4 rounded bg-black/50 px-2 py-1 text-xs font-medium text-white">{duration(media.durationMs ?? null)}</span><div className="absolute inset-x-0 bottom-0 p-5 pr-20 text-white"><p className="font-semibold leading-6">{item.caption}</p><p className="mt-2 text-sm text-white/70">@{item.author.handle}</p></div><div className="absolute bottom-5 right-4 flex flex-col gap-5 text-white"><Action label={compactNumber(item.likeCount)}><Heart className="size-6" /></Action><Action label={compactNumber(item.commentCount)}><MessageCircle className="size-6" /></Action><Action label="공유"><Share2 className="size-6" /></Action></div></div></article>; })}</div>;
}

function Action({ children, label }: { children: React.ReactNode; label: string }) { return <button className="flex flex-col items-center gap-1 text-[11px]"><span className="grid size-11 place-items-center rounded-full bg-black/40 backdrop-blur">{children}</span>{label}</button>; }
