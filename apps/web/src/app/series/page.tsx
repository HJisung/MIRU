import type { Series } from "@stream/api-contract";
import Image from "next/image";
import Link from "next/link";
import { Info, Play } from "lucide-react";
import { getSeriesList } from "@/lib/api";
import { mediaUrl } from "@/lib/client-api";

export const dynamic = "force-dynamic";

export default async function SeriesPage() {
  const { items } = await getSeriesList();
  const featured = items[0];
  if (!featured)
    return (
      <div className="p-8 text-sm text-muted">공개된 시리즈가 없습니다.</div>
    );
  const rows = [
    { title: "지금 주목할 작품", items },
    {
      title: "MIRU 다큐멘터리",
      items: items.filter((work) => work.genres.includes("다큐멘터리")),
    },
    {
      title: "에피소드로 이어지는 이야기",
      items: items.filter((work) => work.workType === "EPISODIC"),
    },
  ].filter((row) => row.items.length > 0);
  return (
    <div className="min-h-screen bg-[#090a09] pb-20 text-white">
      <FeaturedSeries work={featured} />
      <div className="relative z-10 -mt-20 space-y-10 px-4 sm:px-6 lg:px-10">
        {rows.map((row) => (
          <SeriesRow key={row.title} title={row.title} items={row.items} />
        ))}
      </div>
    </div>
  );
}

function FeaturedSeries({ work }: { work: Series }) {
  const publication = work.episodes[0]?.publication;
  const media = publication?.media[0];
  return (
    <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden">
      {media && (
        <Image
          src={mediaUrl(media.url)}
          unoptimized={media.url.startsWith("/api/")}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#090a09] via-transparent to-black/10" />
      <div className="relative flex min-h-[calc(100vh-7rem)] max-w-3xl flex-col justify-center px-6 pb-28 pt-16 sm:px-10 lg:px-16">
        <p className="text-xs font-bold tracking-[0.24em] text-white/60">
          MIRU ORIGINAL SERIES
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
          {work.title}
        </h1>
        <p className="mt-5 line-clamp-3 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
          {work.synopsis}
        </p>
        <div className="mt-7 flex gap-3">
          {publication && (
            <Link
              href={`/post/${publication.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-black"
            >
              <Play className="size-5 fill-current" />
              재생
            </Link>
          )}
          <Link
            href={`/series/${work.id}`}
            className="inline-flex items-center gap-2 rounded-md bg-white/20 px-5 py-3 text-sm font-bold text-white backdrop-blur"
          >
            <Info className="size-5" />
            상세 정보
          </Link>
        </div>
      </div>
    </section>
  );
}

function SeriesRow({ title, items }: { title: string; items: Series[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold sm:text-xl">{title}</h2>
      <div className="flex gap-2.5 overflow-x-auto pb-3">
        {items.map((work) => {
          const media = work.episodes[0]?.publication.media[0];
          return (
            <Link
              key={`${title}-${work.id}`}
              href={`/series/${work.id}`}
              aria-label={work.title}
              className="group relative aspect-video w-[72vw] max-w-[22rem] shrink-0 overflow-hidden rounded-md bg-neutral-800 sm:w-[34vw] lg:w-[24vw] xl:w-[19vw]"
            >
              {media && (
                <Image
                  src={mediaUrl(media.url)}
                  unoptimized={media.url.startsWith("/api/")}
                  alt={work.title}
                  fill
                  sizes="352px"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              <span className="absolute inset-x-0 bottom-0 translate-y-full p-3 text-sm font-semibold transition group-hover:translate-y-0">
                {work.title}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
