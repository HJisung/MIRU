import type { FeedItem } from "@stream/api-contract";
import { Heart, MessageCircle, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { compactNumber, duration, relativeDate } from "@/lib/format";
import { mediaUrl } from "@/lib/client-api";

const formatLabel = {
  IMAGE: "PHOTO",
  SHORT_VIDEO: "SHORT",
  LONG_VIDEO: "FILM",
} as const;

export function FeedCard({
  item,
  priority = false,
}: {
  item: FeedItem;
  priority?: boolean;
}) {
  const media = item.media[0];
  if (!media) return null;
  const ratio =
    item.format === "LONG_VIDEO"
      ? "aspect-video"
      : item.format === "SHORT_VIDEO"
        ? "aspect-[4/5]"
        : "aspect-[4/3]";
  return (
    <article className="group min-w-0">
      <Link
        href={`/post/${item.id}`}
        className={`relative block overflow-hidden rounded-[1.35rem] bg-[#dde0d8] ${ratio}`}
      >
        <Image
          src={mediaUrl(media.url)}
          alt={item.title ?? item.caption}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition duration-500 ease-out group-hover:scale-[1.025]"
          priority={priority}
          unoptimized={media.url.startsWith("/api/")}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] text-white backdrop-blur-md">
          {formatLabel[item.format]}
        </span>
        {item.format !== "IMAGE" && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
            <Play className="size-3 fill-current" />
            {duration(media.durationMs ?? null)}
          </span>
        )}
      </Link>
      <div className="mt-3.5 flex gap-3">
        <div
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[#dfe4d4] text-xs font-bold"
          aria-hidden="true"
        >
          {item.author.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/post/${item.id}`}
            className="line-clamp-2 text-[15px] font-semibold leading-5 tracking-[-0.015em] hover:underline"
          >
            {item.title ?? item.caption}
          </Link>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <span className="truncate">{item.author.displayName}</span>
            <span>·</span>
            <span className="shrink-0">{relativeDate(item.publishedAt)}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <Heart className="size-3.5" />
              {compactNumber(item.likeCount)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3.5" />
              {compactNumber(item.commentCount)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
