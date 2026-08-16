"use client";

import type { ShortformList } from "@stream/api-contract";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Play,
  Share2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { mediaUrl } from "@/lib/client-api";
import { compactNumber } from "@/lib/format";

export function ShortsFeed({ feed }: { feed: ShortformList }) {
  return (
    <div className="h-[calc(100vh-4rem)] snap-y snap-mandatory overflow-y-auto bg-black">
      {feed.items.map((item) => (
        <ShortformSlide key={item.id} item={item} />
      ))}
    </div>
  );
}

function ShortformSlide({ item }: { item: ShortformList["items"][number] }) {
  const [position, setPosition] = useState(0);
  const media = item.media[position];
  if (!media) return null;
  const isCarousel = item.type === "IMAGE_CAROUSEL";
  const promotionHref =
    item.promotedContent?.kind === "HOME_VIDEO"
      ? `/watch/${item.promotedContent.id}`
      : item.promotedContent?.kind === "SERIES"
        ? `/series/${item.promotedContent.id}`
        : item.promotedContent?.kind === "SERIES_EPISODE"
          ? `/watch/${item.promotedContent.publicationId}`
          : null;

  return (
    <article className="relative mx-auto flex min-h-full w-full snap-start items-center justify-center bg-black">
      <div className="relative h-[calc(100vh-5.5rem)] max-h-[60rem] w-full max-w-[34rem] overflow-hidden bg-neutral-950 sm:rounded-2xl">
        <Image
          src={mediaUrl(media.url)}
          unoptimized={media.url.startsWith("/api/")}
          alt={item.title ?? item.description}
          fill
          priority
          className="object-cover"
          sizes="544px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />
        {!isCarousel && (
          <button
            aria-label="재생"
            className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm"
          >
            <Play className="ml-1 size-7 fill-current" />
          </button>
        )}
        {isCarousel && item.media.length > 1 && (
          <>
            <CarouselButton
              label="이전 이미지"
              side="left"
              disabled={position === 0}
              onClick={() => setPosition((value) => value - 1)}
            >
              <ChevronLeft />
            </CarouselButton>
            <CarouselButton
              label="다음 이미지"
              side="right"
              disabled={position === item.media.length - 1}
              onClick={() => setPosition((value) => value + 1)}
            >
              <ChevronRight />
            </CarouselButton>
            <span className="absolute right-4 top-4 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">
              {position + 1} / {item.media.length}
            </span>
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5 pr-20 text-white">
          {item.title && <h1 className="font-semibold">{item.title}</h1>}
          <p className="mt-1 text-sm leading-6 text-white/90">
            {item.description}
          </p>
          <p className="mt-2 text-sm text-white/70">
            @{item.creator.handle}
            {item.musicKey ? ` · ♫ ${item.musicKey}` : ""}
          </p>
          {promotionHref && item.promotedContent && (
            <Link
              href={promotionHref}
              className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              본편 보기 · {item.promotedContent.title}
            </Link>
          )}
        </div>
        <div className="absolute bottom-5 right-4 flex flex-col gap-5 text-white">
          <Action label={compactNumber(item.likeCount)}>
            <Heart className="size-6" />
          </Action>
          <Action label={compactNumber(item.commentCount)}>
            <MessageCircle className="size-6" />
          </Action>
          <Action label="공유">
            <Share2 className="size-6" />
          </Action>
        </div>
      </div>
    </article>
  );
}

function CarouselButton({
  children,
  label,
  side,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white disabled:opacity-25 ${side === "left" ? "left-3" : "right-3"}`}
    >
      {children}
    </button>
  );
}

function Action({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button className="flex flex-col items-center gap-1 text-[11px]">
      <span className="grid size-11 place-items-center rounded-full bg-black/40 backdrop-blur">
        {children}
      </span>
      {label}
    </button>
  );
}
