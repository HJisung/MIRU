import type { CommunityPostList } from "@stream/api-contract";
import {
  ExternalLink,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/client-api";
import { compactNumber, relativeDate } from "@/lib/format";

export function PostTimeline({ feed }: { feed: CommunityPostList }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel-strong">
      {feed.items.map((item) => {
        const media = item.media[0];
        return (
          <article
            key={item.id}
            className="border-b border-line p-4 last:border-b-0 sm:p-5"
          >
            <div className="flex gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#dfe4d4] text-sm font-bold text-black">
                {item.author.displayName.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5 text-sm">
                  <strong className="truncate">
                    {item.author.displayName}
                  </strong>
                  <span className="truncate text-muted">
                    @{item.author.handle}
                  </span>
                  <span className="text-muted">·</span>
                  <span className="shrink-0 text-muted">
                    {relativeDate(item.publishedAt)}
                  </span>
                  {item.category && (
                    <Link
                      href={`/posts/c/${item.category.slug}`}
                      className="ml-auto rounded-full bg-panel px-2 py-1 text-xs font-medium"
                    >
                      {item.category.name}
                    </Link>
                  )}
                </div>
                <Link
                  href={`/posts/${item.id}`}
                  className="mt-2 block whitespace-pre-wrap text-[15px] leading-6 hover:underline"
                >
                  {item.body}
                </Link>
                {item.linkUrl && (
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-2 rounded-xl border border-line p-3 text-sm hover:bg-panel"
                  >
                    <ExternalLink className="size-4" />
                    {safeLinkLabel(item.linkUrl)}
                  </a>
                )}
                {media && item.type === "IMAGE" && (
                  <Link
                    href={`/posts/${item.id}`}
                    className="relative mt-4 block aspect-[16/9] max-h-[30rem] overflow-hidden rounded-2xl border border-line bg-background"
                  >
                    <Image
                      src={mediaUrl(media.url)}
                      unoptimized={media.url.startsWith("/api/")}
                      alt={item.body}
                      fill
                      sizes="(max-width: 768px) 100vw, 680px"
                      className="object-cover"
                    />
                  </Link>
                )}
                {media && item.type === "VIDEO" && (
                  <Link
                    href={`/posts/${item.id}`}
                    className="relative mt-4 grid aspect-video place-items-center overflow-hidden rounded-2xl border border-line bg-black text-sm font-semibold text-white"
                  >
                    {media.posterUrl ? (
                      <Image
                        src={mediaUrl(media.posterUrl)}
                        unoptimized={media.posterUrl.startsWith("/api/")}
                        alt={`${item.body || "동영상 Post"} 포스터`}
                        fill
                        sizes="(max-width: 768px) 100vw, 680px"
                        className="object-cover opacity-80"
                      />
                    ) : null}
                    <span className="relative rounded-full bg-black/70 px-4 py-2">
                      동영상 보기
                    </span>
                  </Link>
                )}
                <div className="mt-3 flex max-w-md items-center justify-between text-xs text-muted">
                  <button className="flex items-center gap-1.5 hover:text-red-500">
                    <Heart className="size-4" />
                    {compactNumber(item.likeCount)}
                  </button>
                  <button className="flex items-center gap-1.5 hover:text-blue-600">
                    <MessageCircle className="size-4" />
                    {compactNumber(item.commentCount)}
                  </button>
                  <button aria-label="재게시" className="hover:text-green-600">
                    <Repeat2 className="size-4" />
                  </button>
                  <button aria-label="공유" className="hover:text-ink">
                    <Share2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
      {feed.items.length === 0 && (
        <p className="p-10 text-center text-sm text-muted">
          아직 공개된 게시물이 없습니다.
        </p>
      )}
    </div>
  );
}

function safeLinkLabel(value: string) {
  try {
    return new URL(value).hostname || value;
  } catch {
    return value;
  }
}
