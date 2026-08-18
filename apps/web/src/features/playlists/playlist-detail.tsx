"use client";

import Link from "next/link";
import type { Playlist } from "@stream/api-contract";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";
import { visibilityLabel } from "./playlist-library";

export function PlaylistDetail({ playlistId }: { playlistId: string }) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    clientApi<Playlist>(`/playlists/${playlistId}/manage`)
      .then((value) => {
        if (current) {
          setOwned(true);
          setPlaylist(value);
          setError("");
        }
      })
      .catch(() =>
        clientApi<Playlist>(`/playlists/${playlistId}`).then((value) => {
          if (current) setPlaylist(value);
        }),
      )
      .catch((reason: unknown) => {
        if (current)
          setError(
            reason instanceof Error
              ? reason.message
              : "Playlist를 불러오지 못했습니다.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [playlistId]);
  async function reorder(index: number, delta: number) {
    if (!playlist) return;
    const next = [...playlist.items];
    const destination = index + delta;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination]!, next[index]!];
    try {
      setPlaylist(
        await clientApi<Playlist>(`/playlists/${playlist.id}/items/order`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemIds: next.map((item) => item.id) }),
        }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "순서를 바꾸지 못했습니다.",
      );
    }
  }
  async function remove(itemId: string) {
    if (!playlist) return;
    try {
      setPlaylist(
        await clientApi<Playlist>(`/playlists/${playlist.id}/items/${itemId}`, {
          method: "DELETE",
        }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "항목을 삭제하지 못했습니다.",
      );
    }
  }
  if (loading)
    return (
      <LoaderCircle
        aria-label="불러오는 중"
        className="mx-auto mt-20 size-7 animate-spin"
      />
    );
  return (
    <section className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <Link
        href="/playlists"
        className="inline-flex items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft className="size-4" /> 내 Playlist
      </Link>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {playlist && (
        <>
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
              {visibilityLabel(playlist.visibility)}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{playlist.title}</h1>
            {playlist.description && (
              <p className="mt-2 text-sm text-muted">{playlist.description}</p>
            )}
          </div>
          <ol className="mt-7 space-y-3">
            {playlist.items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-panel-strong p-4"
              >
                <span className="w-7 text-center text-sm font-bold text-muted">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {item.available && item.href ? (
                    <Link
                      href={item.href}
                      className="line-clamp-1 font-semibold hover:underline"
                    >
                      {item.title ?? "제목 없는 콘텐츠"}
                    </Link>
                  ) : (
                    <p className="font-semibold text-muted">
                      현재 볼 수 없는 콘텐츠
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted">{item.target.type}</p>
                </div>
                {owned && (
                  <div className="flex gap-1">
                    <button
                      aria-label={`${item.title ?? "항목"} 위로`}
                      disabled={index === 0}
                      onClick={() => void reorder(index, -1)}
                      className="grid size-9 place-items-center rounded-lg border border-line disabled:opacity-30"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      aria-label={`${item.title ?? "항목"} 아래로`}
                      disabled={index === playlist.items.length - 1}
                      onClick={() => void reorder(index, 1)}
                      className="grid size-9 place-items-center rounded-lg border border-line disabled:opacity-30"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      aria-label={`${item.title ?? "항목"} 삭제`}
                      onClick={() => void remove(item.id)}
                      className="grid size-9 place-items-center rounded-lg border border-line text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
          {playlist.items.length === 0 && (
            <p className="mt-10 text-center text-sm text-muted">
              탐색 화면에서 콘텐츠를 추가해 보세요.
            </p>
          )}
        </>
      )}
    </section>
  );
}
