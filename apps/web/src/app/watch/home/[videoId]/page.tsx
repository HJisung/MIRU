import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle } from "lucide-react";
import { ApiError, getHomeVideo } from "@/lib/api";
import { mediaUrl } from "@/lib/client-api";
import { compactNumber, duration, relativeDate } from "@/lib/format";
import { VideoPlayer } from "@/components/video-player";

export default async function HomeWatch({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  let video;
  try {
    video = await getHomeVideo((await params).videoId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const media = video.media;
  return (
    <div className="mx-auto max-w-[112rem] px-4 pb-20 pt-6 sm:px-6 lg:px-10">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft className="size-4" /> 홈으로
      </Link>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
        {media.mimeType === "application/vnd.apple.mpegurl" ? (
          <VideoPlayer source={media.url} poster={media.posterUrl} />
        ) : (
          <Image
            src={mediaUrl(media.url)}
            unoptimized={media.url.startsWith("/api/")}
            alt={video.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <span className="absolute bottom-4 right-4 rounded bg-black/70 px-2 py-1 text-xs text-white">
          {duration(media.durationMs ?? null)}
        </span>
      </div>
      <p className="mt-6 text-xs font-bold text-muted">HOME · SINGLE</p>
      <h1 className="mt-2 text-3xl font-semibold">{video.title}</h1>
      <div className="mt-4 flex justify-between gap-4 text-sm text-muted">
        <p>
          {video.creator.displayName} · {relativeDate(video.publishedAt)}
        </p>
        <div className="flex gap-3">
          <span className="flex gap-1">
            <Heart className="size-4" />
            {compactNumber(video.likeCount)}
          </span>
          <span className="flex gap-1">
            <MessageCircle className="size-4" />
            {compactNumber(video.commentCount)}
          </span>
        </div>
      </div>
      <p className="mt-6 rounded-2xl bg-panel p-5 text-sm leading-7">
        {video.description}
      </p>
    </div>
  );
}
