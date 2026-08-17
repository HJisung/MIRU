import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { ApiError, getSeries } from "@/lib/api";
import { mediaUrl } from "@/lib/client-api";
import { duration } from "@/lib/format";
import { VideoPlayer } from "@/components/video-player";

export default async function SingleWorkWatch({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  let work;
  try {
    work = await getSeries((await params).seriesId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  if (work.workType !== "SINGLE_WORK" || !work.singleWork) notFound();
  const media = work.singleWork.media;
  return (
    <div className="mx-auto max-w-[112rem] px-4 pb-20 pt-6 sm:px-6 lg:px-10">
      <Link
        href={`/series/${work.id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft className="size-4" /> 작품으로
      </Link>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
        {media.mimeType === "application/vnd.apple.mpegurl" ? (
          <VideoPlayer source={media.url} poster={media.posterUrl} />
        ) : (
          <>
            <Image
              src={mediaUrl(media.url)}
              unoptimized={media.url.startsWith("/api/")}
              alt={work.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <Play className="absolute inset-0 m-auto size-14 text-white" />
          </>
        )}
        <span className="absolute bottom-4 right-4 rounded bg-black/70 px-2 py-1 text-xs text-white">
          {duration(media.durationMs ?? null)}
        </span>
      </div>
      <p className="mt-6 text-xs font-bold text-muted">SERIES · SINGLE WORK</p>
      <h1 className="mt-2 text-3xl font-semibold">{work.title}</h1>
      <p className="mt-5 text-sm leading-7 text-muted">{work.synopsis}</p>
    </div>
  );
}
