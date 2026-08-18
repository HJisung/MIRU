"use client";

import Link from "next/link";
import type { Playlist, PlaylistList } from "@stream/api-contract";
import { ListVideo, LoaderCircle, Plus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";

export function PlaylistLibrary() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function refresh() {
    try {
      setPlaylists((await clientApi<PlaylistList>("/playlists/me")).items);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Playlist를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let current = true;
    clientApi<PlaylistList>("/playlists/me")
      .then((result) => {
        if (current) {
          setPlaylists(result.items);
          setError("");
        }
      })
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
  }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await clientApi<Playlist>("/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          visibility: form.get("visibility"),
        }),
      });
      event.currentTarget.reset();
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Playlist를 만들지 못했습니다.",
      );
    }
  }
  return (
    <section className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
        Library
      </p>
      <h1 className="mt-2 text-3xl font-semibold">내 Playlist</h1>
      <p className="mt-2 text-sm text-muted">
        저장과 별개로, 재생할 콘텐츠를 원하는 순서로 정리합니다.
      </p>
      <form
        onSubmit={(event) => void create(event)}
        className="mt-7 grid gap-3 rounded-2xl border border-line bg-panel-strong p-5 sm:grid-cols-[1fr_1fr_auto]"
        aria-label="Playlist 만들기"
      >
        <label className="text-xs font-semibold text-muted">
          제목
          <input
            name="title"
            required
            maxLength={120}
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-background px-3 text-sm text-ink"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          설명
          <input
            name="description"
            maxLength={500}
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-background px-3 text-sm text-ink"
          />
        </label>
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="playlist-visibility">
            공개 범위
          </label>
          <select
            id="playlist-visibility"
            name="visibility"
            defaultValue="PRIVATE"
            className="h-11 rounded-xl border border-line bg-background px-3 text-sm"
          >
            <VisibilityOptions />
          </select>
          <button className="flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-background">
            <Plus className="size-4" /> 만들기
          </button>
        </div>
      </form>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {loading ? (
        <LoaderCircle
          aria-label="불러오는 중"
          className="mx-auto mt-12 size-6 animate-spin"
        />
      ) : (
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {playlists.map((playlist) => (
            <Link
              key={playlist.id}
              href={`/playlists/${playlist.id}`}
              className="rounded-2xl border border-line bg-panel-strong p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
                  <ListVideo className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold">{playlist.title}</h2>
                  <p className="text-xs text-muted">
                    {visibilityLabel(playlist.visibility)} ·{" "}
                    {playlist.items.length}개 항목
                  </p>
                </div>
              </div>
              {playlist.description && (
                <p className="mt-4 line-clamp-2 text-sm text-muted">
                  {playlist.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
      {!loading && !error && playlists.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted">
          아직 Playlist가 없습니다.
        </p>
      )}
    </section>
  );
}

export function VisibilityOptions() {
  return (
    <>
      {(["PRIVATE", "UNLISTED", "PUBLIC"] as Playlist["visibility"][]).map(
        (value) => (
          <option key={value} value={value}>
            {visibilityLabel(value)}
          </option>
        ),
      )}
    </>
  );
}
export function visibilityLabel(value: Playlist["visibility"]) {
  return value === "PRIVATE"
    ? "비공개"
    : value === "UNLISTED"
      ? "링크 공개"
      : "전체 공개";
}
