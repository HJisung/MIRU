import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { ApiError, getSeries } from "@/lib/api";
import { mediaUrl } from "@/lib/client-api";
import { duration } from "@/lib/format";

interface SeriesDetailProps {
  params: Promise<{ seriesId: string }>;
}

export default async function SeriesDetail({ params }: SeriesDetailProps) {
  let work;
  try {
    work = await getSeries((await params).seriesId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const hero = work.singleWork?.media ?? work.episodes[0]?.media;
  return (
    <div className="pb-20">
      <section className="relative min-h-[28rem] overflow-hidden bg-black text-white">
        {hero && (
          <Image
            src={mediaUrl(hero.url)}
            unoptimized={hero.url.startsWith("/api/")}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-55"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div className="relative mx-auto flex min-h-[28rem] max-w-[112rem] flex-col justify-end px-5 py-12 sm:px-8 lg:px-12">
          <Link
            href="/series"
            className="mb-auto inline-flex w-fit items-center gap-2 text-sm text-white/70"
          >
            <ArrowLeft className="size-4" /> 시리즈
          </Link>
          <p className="text-xs font-bold tracking-[0.2em] text-white/60">
            {work.workType === "EPISODIC" ? "EPISODIC SERIES" : "SINGLE WORK"}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
            {work.title}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/75">
            {work.synopsis}
          </p>
          <p className="mt-4 text-sm text-white/55">
            {work.creator.displayName} · {work.ageRating ?? "등급 정보 없음"}
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-[112rem] px-4 pt-9 sm:px-6 lg:px-10">
        {work.singleWork && (
          <Link
            href={`/watch/series/${work.id}`}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-bold text-background"
          >
            <Play className="size-5 fill-current" /> 작품 재생
          </Link>
        )}
        {work.workType === "EPISODIC" && (
          <h2 className="text-xl font-semibold">에피소드</h2>
        )}
        <div className="mt-5 space-y-4">
          {work.episodes.map((episode) => {
            const media = episode.media;
            return (
              <Link
                key={episode.id}
                href={`/watch/episode/${episode.id}`}
                className="grid gap-4 rounded-2xl border border-line p-3 transition hover:bg-panel sm:grid-cols-[18rem_1fr]"
              >
                {media && (
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                    <Image
                      src={mediaUrl(media.url)}
                      unoptimized={media.url.startsWith("/api/")}
                      alt={episode.title}
                      fill
                      sizes="288px"
                      className="object-cover"
                    />
                    <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[11px] text-white">
                      <Play className="mr-1 inline size-3 fill-current" />
                      {duration(media.durationMs ?? null)}
                    </span>
                  </div>
                )}
                <div className="py-2">
                  <p className="text-xs font-semibold text-muted">
                    EP.{episode.episodeNumber}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    {episode.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                    {episode.synopsis}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
