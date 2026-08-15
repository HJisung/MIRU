import type { DiscoveryFeed as DiscoveryFeedData } from "@stream/api-contract";
import { Heart, MessageCircle, Repeat2, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/client-api";
import { compactNumber, relativeDate } from "@/lib/format";

export function PostTimeline({ feed }: { feed: DiscoveryFeedData }) {
  return <div className="overflow-hidden rounded-2xl border border-line bg-panel-strong">{feed.items.map((item) => {
    const media = item.media[0];
    return <article key={item.id} className="border-b border-line p-4 last:border-b-0 sm:p-5"><div className="flex gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#dfe4d4] text-sm font-bold">{item.author.displayName.slice(0, 1)}</div><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-1.5 text-sm"><strong className="truncate">{item.author.displayName}</strong><span className="truncate text-muted">@{item.author.handle}</span><span className="text-muted">·</span><span className="shrink-0 text-muted">{relativeDate(item.publishedAt)}</span></div><Link href={`/post/${item.id}`} className="mt-2 block whitespace-pre-wrap text-[15px] leading-6 hover:underline">{item.caption}</Link>{media && <Link href={`/post/${item.id}`} className="relative mt-4 block aspect-[16/9] max-h-[30rem] overflow-hidden rounded-2xl border border-line bg-background"><Image src={mediaUrl(media.url)} unoptimized={media.url.startsWith("/api/")} alt={item.caption} fill sizes="(max-width: 768px) 100vw, 680px" className="object-cover" /></Link>}<div className="mt-3 flex max-w-md items-center justify-between text-xs text-muted"><button className="flex items-center gap-1.5 hover:text-red-500"><Heart className="size-4" />{compactNumber(item.likeCount)}</button><button className="flex items-center gap-1.5 hover:text-blue-600"><MessageCircle className="size-4" />{compactNumber(item.commentCount)}</button><button aria-label="재게시" className="hover:text-green-600"><Repeat2 className="size-4" /></button><button aria-label="공유" className="hover:text-ink"><Share2 className="size-4" /></button></div></div></div></article>;
  })}</div>;
}
