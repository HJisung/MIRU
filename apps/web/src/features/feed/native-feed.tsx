"use client";

import Image from "next/image";
import Link from "next/link";
import type {
  DiscoveryFeed,
  FeedItem,
  PlaylistList,
} from "@stream/api-contract";
import { BookmarkPlus, Heart, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { clientApi, mediaUrl } from "@/lib/client-api";
import { compactNumber, relativeDate } from "@/lib/format";

type FeedType = FeedItem["type"];

export function NativeFeed() {
  const [mode, setMode] = useState<"discovery" | "following">("discovery");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(next?: string, replace = false) {
    setLoading(true);
    setError("");
    try {
      const query = next ? `?cursor=${encodeURIComponent(next)}` : "";
      const page = await clientApi<DiscoveryFeed>(`/feed/${mode}${query}`);
      setItems((current) =>
        replace ? page.items : [...current, ...page.items],
      );
      setCursor(page.nextCursor ?? null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "피드를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let current = true;
    clientApi<DiscoveryFeed>(`/feed/${mode}`)
      .then((page) => {
        if (!current) return;
        setItems(page.items);
        setCursor(page.nextCursor ?? null);
        setError("");
      })
      .catch((reason: unknown) => {
        if (current)
          setError(
            reason instanceof Error
              ? reason.message
              : "피드를 불러오지 못했습니다.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [mode]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-7 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
            Discover
          </p>
          <h1 className="mt-2 text-3xl font-semibold">MIRU 탐색</h1>
          <p className="mt-2 text-sm text-muted">
            제품의 실제 공개 상태를 기준으로 모은 콘텐츠입니다.
          </p>
        </div>
        <div
          className="flex rounded-xl border border-line bg-panel p-1"
          role="tablist"
          aria-label="피드 선택"
        >
          {(["discovery", "following"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === value ? "bg-ink text-background" : "text-muted"}`}
            >
              {value === "discovery" ? "발견" : "팔로잉"}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-8 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <div className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <FeedCard key={`${item.type}:${item.id}`} item={item} />
        ))}
      </div>
      {!loading && !error && items.length === 0 && (
        <p className="mt-12 text-center text-sm text-muted">
          표시할 콘텐츠가 없습니다.
        </p>
      )}
      <div className="mt-10 flex justify-center">
        {cursor && (
          <button
            disabled={loading}
            onClick={() => void load(cursor)}
            className="rounded-full border border-line bg-panel-strong px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            더 보기
          </button>
        )}
        {loading && (
          <LoaderCircle
            aria-label="불러오는 중"
            className="size-6 animate-spin text-muted"
          />
        )}
      </div>
    </section>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const [likes, setLikes] = useState(item.likeCount);
  const [liked, setLiked] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistList | null>(null);
  const [message, setMessage] = useState("");
  const href = productHref(item.type, item.id);
  const preview = item.media[0];
  const canAddToPlaylist =
    item.type !== "SHORTFORM" ||
    item.media.some((media) => media.mimeType.startsWith("video/"));
  async function like() {
    const state = await clientApi<{ liked: boolean; likeCount: number }>(
      `/engagement/${item.type}/${item.id}/like`,
      { method: liked ? "DELETE" : "PUT" },
    );
    setLiked(state.liked);
    setLikes(state.likeCount);
  }
  async function openPlaylists() {
    try {
      setPlaylists(await clientApi<PlaylistList>("/playlists/me"));
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Playlist를 불러오지 못했습니다.",
      );
    }
  }
  async function add(playlistId: string) {
    try {
      await clientApi(`/playlists/${playlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type, id: item.id }),
      });
      setMessage("Playlist에 추가했습니다.");
      setPlaylists(null);
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "추가하지 못했습니다.",
      );
    }
  }
  return (
    <article className="min-w-0">
      <Link
        href={href}
        className="group relative block aspect-video overflow-hidden rounded-2xl bg-black"
      >
        {preview && (
          <Image
            src={mediaUrl(preview.posterUrl ?? preview.url)}
            unoptimized={(preview.posterUrl ?? preview.url).startsWith("/api/")}
            alt={item.title ?? item.caption}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition group-hover:scale-[1.02]"
          />
        )}
        <span className="absolute left-3 top-3 rounded-md bg-black/75 px-2 py-1 text-[10px] font-bold text-white">
          {label(item.type)}
        </span>
      </Link>
      <div className="mt-3">
        <Link
          href={href}
          className="line-clamp-2 font-semibold hover:underline"
        >
          {item.title ?? item.caption}
        </Link>
        <p className="mt-1 text-xs text-muted">
          {item.author.displayName} · @{item.author.handle} ·{" "}
          {relativeDate(item.publishedAt)}
        </p>
        {item.series && (
          <p className="mt-1 text-xs text-accent">
            {item.series.title} · EP.{item.series.episodeNumber}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button
            aria-label={`${item.title ?? "콘텐츠"} 좋아요`}
            onClick={() => void like()}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold"
          >
            <Heart
              className={`size-3.5 ${liked ? "fill-current text-red-500" : ""}`}
            />{" "}
            {compactNumber(likes)}
          </button>
          {canAddToPlaylist && (
            <button
              aria-label={`${item.title ?? "콘텐츠"} Playlist에 추가`}
              onClick={() => void openPlaylists()}
              className="ml-auto grid size-8 place-items-center rounded-full border border-line"
            >
              <BookmarkPlus className="size-4" />
            </button>
          )}
        </div>
        {playlists && (
          <div
            className="mt-2 rounded-xl border border-line bg-panel-strong p-2"
            aria-label="Playlist 선택"
          >
            {playlists.items.length ? (
              playlists.items.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => void add(playlist.id)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-panel"
                >
                  {playlist.title}
                </button>
              ))
            ) : (
              <Link
                href="/playlists"
                className="block px-3 py-2 text-sm text-accent"
              >
                먼저 Playlist를 만드세요
              </Link>
            )}
          </div>
        )}
        {message && (
          <p role="status" className="mt-2 text-xs text-muted">
            {message}
          </p>
        )}
      </div>
    </article>
  );
}

function productHref(type: FeedType, id: string) {
  if (type === "HOME_VIDEO") return `/watch/home/${id}`;
  if (type === "SERIES") return `/watch/series/${id}`;
  if (type === "SERIES_EPISODE") return `/watch/episode/${id}`;
  return `/shorts/${id}`;
}
function label(type: FeedType) {
  return type === "HOME_VIDEO"
    ? "HOME"
    : type === "SERIES_EPISODE"
      ? "EPISODE"
      : type;
}
