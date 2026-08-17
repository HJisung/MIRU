import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { ApiError, getSeriesEpisode } from "@/lib/api";
import { mediaUrl } from "@/lib/client-api";
import { duration } from "@/lib/format";
import { VideoPlayer } from "@/components/video-player";

export default async function EpisodeWatch({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  let episode;
  try {
    episode = await getSeriesEpisode((await params).episodeId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  if (!episode.media) notFound();
  return (
    <div className="mx-auto max-w-[112rem] px-4 pb-20 pt-6 sm:px-6 lg:px-10">
      <Link
        href={`/series/${episode.seriesId}`}
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft className="size-4" /> 작품으로
      </Link>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
        {episode.media.mimeType === "application/vnd.apple.mpegurl" ? (
          <VideoPlayer
            source={episode.media.url}
            poster={episode.media.posterUrl}
          />
        ) : (
          <>
            <Image
              src={mediaUrl(episode.media.url)}
              unoptimized={episode.media.url.startsWith("/api/")}
              alt={episode.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <Play className="absolute inset-0 m-auto size-14 text-white" />
          </>
        )}
        <span className="absolute bottom-4 right-4 rounded bg-black/70 px-2 py-1 text-xs text-white">
          {duration(episode.media.durationMs ?? null)}
        </span>
      </div>
      <p className="mt-6 text-xs font-bold text-muted">
        EPISODE {episode.episodeNumber}
      </p>
      <h1 className="mt-2 text-3xl font-semibold">{episode.title}</h1>
      <p className="mt-5 text-sm leading-7 text-muted">{episode.synopsis}</p>
    </div>
  );
}
