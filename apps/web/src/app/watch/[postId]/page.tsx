import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle, Play } from "lucide-react";
import { ApiError, getHomeVideo } from "@/lib/api";
import { mediaUrl } from "@/lib/client-api";
import { compactNumber, duration, relativeDate } from "@/lib/format";

interface WatchPageProps {
  params: Promise<{ postId: string }>;
}

async function loadVideo(id: string) {
  try {
    return await getHomeVideo(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: WatchPageProps): Promise<Metadata> {
  const video = await loadVideo((await params).postId);
  return { title: video.title, description: video.description };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const video = await loadVideo((await params).postId);
  const media = video.publication.media[0];
  if (!media) notFound();
  return (
    <div className="mx-auto w-full max-w-[112rem] px-4 pb-20 pt-6 sm:px-6 lg:px-10">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> 홈으로
      </Link>
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <Image
          src={mediaUrl(media.url)}
          unoptimized={media.url.startsWith("/api/")}
          alt={video.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <button
          aria-label="영상 재생"
          className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full bg-white/90 text-black shadow-xl"
        >
          <Play className="ml-1 size-6 fill-current" />
        </button>
        {duration(media.durationMs ?? null) && (
          <span className="absolute bottom-4 right-4 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white">
            {duration(media.durationMs ?? null)}
          </span>
        )}
      </div>
      <article className="py-6">
        <p className="text-xs font-bold tracking-[0.18em] text-muted">
          HOME · SINGLE
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
          {video.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">
            {video.creator.displayName} · {relativeDate(video.publishedAt)}
          </p>
          <div className="flex gap-3 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Heart className="size-4" />
              {compactNumber(video.publication.likeCount)}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="size-4" />
              {compactNumber(video.publication.commentCount)}
            </span>
          </div>
        </div>
        <p className="mt-6 max-w-4xl whitespace-pre-wrap rounded-2xl bg-panel p-5 text-sm leading-7">
          {video.description}
        </p>
      </article>
    </div>
  );
}
