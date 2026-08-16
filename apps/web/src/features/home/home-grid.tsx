import type { CollectionList, HomeVideoList } from "@stream/api-contract";
import Image from "next/image";
import Link from "next/link";
import { ListVideo, Play } from "lucide-react";
import { mediaUrl } from "@/lib/client-api";
import { duration, relativeDate } from "@/lib/format";

export function HomeGrid({
  videos,
  collections,
}: {
  videos: HomeVideoList;
  collections: CollectionList;
}) {
  const cards = [
    ...videos.items.map((video) => ({
      kind: "single" as const,
      id: video.id,
      video,
    })),
    ...collections.items.flatMap((collection) =>
      collection.items[0]
        ? [
            {
              kind: "collection" as const,
              id: collection.id,
              video: collection.items[0].video,
              collection,
            },
          ]
        : [],
    ),
  ];
  return (
    <section
      aria-label="홈 콘텐츠"
      className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-x-4 gap-y-9"
    >
      {cards.map((card) => {
        const media = card.video.publication.media[0];
        if (!media) return null;
        const title =
          card.kind === "collection" ? card.collection.title : card.video.title;
        const description =
          card.kind === "collection"
            ? `${card.collection.items.length}개 영상 · ${card.collection.owner.displayName}`
            : `${card.video.creator.displayName} · ${relativeDate(card.video.publishedAt)}`;
        return (
          <article key={`${card.kind}-${card.id}`} className="group min-w-0">
            <Link
              href={`/watch/${card.video.id}`}
              className="relative block aspect-video overflow-hidden rounded-xl bg-black"
            >
              <Image
                src={mediaUrl(media.url)}
                unoptimized={media.url.startsWith("/api/")}
                alt={title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                className="object-cover transition duration-300 group-hover:scale-[1.015]"
              />
              {card.kind === "collection" && (
                <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/75 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  <ListVideo className="size-3.5" />
                  Collection
                </span>
              )}
              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/75 px-1.5 py-1 text-[11px] font-semibold text-white">
                <Play className="size-3 fill-current" />
                {duration(media.durationMs ?? null)}
              </span>
            </Link>
            <div className="mt-3 flex gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold">
                {card.video.creator.displayName.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/watch/${card.video.id}`}
                  className="line-clamp-2 font-semibold leading-5 hover:underline"
                >
                  {title}
                </Link>
                <p className="mt-1 truncate text-xs text-muted">
                  {description}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
