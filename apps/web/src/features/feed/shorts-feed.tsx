import type { DiscoveryFeed as DiscoveryFeedData } from "@stream/api-contract";
import { Heart, MessageCircle, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/client-api";
import { compactNumber, duration } from "@/lib/format";

export function ShortsFeed({ feed }: { feed: DiscoveryFeedData }) {
  return <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">{feed.items.map((item) => {
    const media = item.media[0]; if (!media) return null;
    return <article key={item.id} className="mx-auto w-full max-w-[25rem]"><Link href={`/post/${item.id}`} className="group relative block aspect-[9/16] overflow-hidden rounded-[1.75rem] bg-black"><Image src={mediaUrl(media.url)} unoptimized={media.url.startsWith("/api/")} alt={item.caption} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover transition duration-500 group-hover:scale-[1.02]" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" /><span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white"><Play className="size-3 fill-current" /> {duration(media.durationMs ?? null)}</span><div className="absolute inset-x-0 bottom-0 p-5 text-white"><p className="line-clamp-2 font-semibold leading-6">{item.caption}</p><p className="mt-2 text-sm text-white/70">@{item.author.handle}</p><div className="mt-4 flex gap-4 text-xs"><span className="flex items-center gap-1.5"><Heart className="size-4" />{compactNumber(item.likeCount)}</span><span className="flex items-center gap-1.5"><MessageCircle className="size-4" />{compactNumber(item.commentCount)}</span></div></div></Link></article>;
  })}</div>;
}
