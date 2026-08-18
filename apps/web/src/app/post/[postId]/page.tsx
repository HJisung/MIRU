import type { Metadata } from "next";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Play,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, getPost } from "@/lib/api";
import { mediaUrl } from "@/lib/client-api";
import { compactNumber, duration, relativeDate } from "@/lib/format";

interface PostPageProps {
  params: Promise<{ postId: string }>;
}
async function loadPost(postId: string) {
  try {
    return await getPost(postId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const post = await loadPost((await params).postId);
  return {
    title: post.title ?? `${post.author.displayName}의 게시물`,
    description: post.caption,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await loadPost((await params).postId);
  const media = post.media[0];
  if (!media) notFound();
  const isLongform = post.format === "LONG_VIDEO";
  return (
    <div
      className={`mx-auto w-full px-4 pb-20 pt-5 sm:px-6 lg:px-8 ${isLongform ? "max-w-[112rem]" : "max-w-6xl"}`}
    >
      <Link
        href={isLongform ? "/" : "/posts"}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> 목록으로 돌아가기
      </Link>
      <article className="overflow-hidden rounded-[1.75rem] border border-line bg-panel-strong">
        <div
          className={`relative bg-black ${post.format === "SHORT_VIDEO" ? "mx-auto aspect-[4/5] max-h-[72vh] max-w-xl" : "aspect-video w-full"}`}
        >
          <Image
            src={mediaUrl(media.url)}
            unoptimized={media.url.startsWith("/api/")}
            alt={post.title ?? post.caption}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {post.format !== "IMAGE" && (
            <button
              aria-label="영상 재생"
              className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full bg-white/90 text-black shadow-xl"
            >
              <Play className="ml-1 size-6 fill-current" />
            </button>
          )}
          {duration(media.durationMs ?? null) && (
            <span className="absolute bottom-4 right-4 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white">
              {duration(media.durationMs ?? null)}
            </span>
          )}
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="grid size-11 place-items-center rounded-full bg-[#dfe4d4] font-bold text-black">
                {post.author.displayName.slice(0, 1)}
              </div>
              <div>
                <p className="font-semibold">{post.author.displayName}</p>
                <p className="text-xs text-muted">
                  @{post.author.handle} · {relativeDate(post.publishedAt)}
                </p>
              </div>
            </div>
            <button
              aria-label="더보기"
              className="grid size-10 place-items-center rounded-full"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </div>
          {post.title && (
            <h1 className="mt-6 text-2xl font-semibold">{post.title}</h1>
          )}
          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7">
            {post.caption}
          </p>
          <div className="mt-7 flex items-center gap-2 border-t border-line pt-5">
            <button className="flex h-10 items-center gap-2 rounded-full bg-background px-4 text-sm font-semibold">
              <Heart className="size-4" /> {compactNumber(post.likeCount)}
            </button>
            <button className="flex h-10 items-center gap-2 rounded-full bg-background px-4 text-sm font-semibold">
              <MessageCircle className="size-4" />{" "}
              {compactNumber(post.commentCount)}
            </button>
            <button
              aria-label="저장"
              className="ml-auto grid size-10 place-items-center rounded-full bg-background"
            >
              <Bookmark className="size-4" />
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
