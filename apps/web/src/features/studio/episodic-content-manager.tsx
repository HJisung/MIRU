"use client";

import type { ManagedSeries } from "@stream/api-contract";
import { ArrowDown, ArrowUp, CirclePlus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { clientApi } from "@/lib/client-api";

type Episode = ManagedSeries["episodes"][number];
type Season = ManagedSeries["seasons"][number];

export function EpisodicContentManager({
  series,
  reload,
}: {
  series: ManagedSeries;
  reload: () => Promise<unknown>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(path: string, init: RequestInit) {
    setBusy(true);
    setError("");
    try {
      await clientApi(path, init);
      await reload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "처리하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await request(`/series/${series.id}/seasons`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        seasonNumber: Number(data.get("seasonNumber")),
        title: String(data.get("title") || "") || null,
        description: String(data.get("description") || ""),
      }),
    });
    event.currentTarget.reset();
  }

  async function reorder(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= series.episodes.length) return;
    const ids = series.episodes.map((episode) => episode.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    await request(`/series/${series.id}/episodes/order`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ episodeIds: ids }),
    });
  }

  const groups = [
    ...series.seasons.map((season) => ({
      season,
      episodes: series.episodes.filter(
        (episode) => episode.seasonId === season.id,
      ),
    })),
    {
      season: null,
      episodes: series.episodes.filter((episode) => !episode.seasonId),
    },
  ];

  return (
    <section className="mt-8 rounded-2xl border border-line bg-panel-strong p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">에피소드 콘텐츠</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            영상을 추가한 뒤 Series를 공개하고, 공개할 Episode를 선택하세요.
            전체 번호가 공개 재생 순서를 결정합니다.
          </p>
        </div>
        {series.canManageContent && (
          <Link
            href={`/create?type=series-episode&seriesId=${series.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-background"
          >
            <CirclePlus className="size-4" /> 새 에피소드
          </Link>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {series.canManageContent && (
        <form
          onSubmit={createSeason}
          className="mt-6 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[8rem_1fr_1fr_auto]"
        >
          <input
            required
            min={1}
            type="number"
            name="seasonNumber"
            aria-label="시즌 번호"
            placeholder="시즌 번호"
            className="rounded-lg border border-line bg-background px-3 py-2"
          />
          <input
            name="title"
            aria-label="시즌 제목"
            placeholder="시즌 제목 (선택)"
            className="rounded-lg border border-line bg-background px-3 py-2"
          />
          <input
            name="description"
            aria-label="시즌 설명"
            placeholder="시즌 설명"
            className="rounded-lg border border-line bg-background px-3 py-2"
          />
          <button
            disabled={busy}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold"
          >
            시즌 추가
          </button>
        </form>
      )}

      {series.episodes.length > 0 && (
        <div className="mt-6 rounded-xl border border-line p-4">
          <h3 className="font-semibold">전체 공개 순서</h3>
          <p className="mt-1 text-xs text-muted">
            Season 표시와 별개로 Series 전체의 EP 번호를 정합니다.
          </p>
          <ol className="mt-3 space-y-2">
            {series.episodes.map((episode, index) => (
              <li
                key={episode.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  EP.{episode.episodeNumber} · {episode.title}
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => void reorder(index, -1)}
                    aria-label={`${episode.title} 전체 순서 위로`}
                    className="rounded-full border border-line p-2 disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === series.episodes.length - 1}
                    onClick={() => void reorder(index, 1)}
                    aria-label={`${episode.title} 전체 순서 아래로`}
                    className="rounded-full border border-line p-2 disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {groups.map(({ season, episodes }) => (
          <div key={season?.id ?? "unseasoned"}>
            {season ? (
              <SeasonHeader
                seriesId={series.id}
                season={season}
                busy={busy}
                request={request}
              />
            ) : (
              <h3 className="font-semibold">시즌 없음</h3>
            )}
            <div className="mt-3 space-y-3">
              {episodes.length === 0 && (
                <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
                  에피소드가 없습니다.
                </p>
              )}
              {episodes.map((episode) => {
                return (
                  <EpisodeEditor
                    key={episode.id}
                    series={series}
                    episode={episode}
                    busy={busy}
                    request={request}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SeasonHeader({
  seriesId,
  season,
  busy,
  request,
}: {
  seriesId: string;
  season: Season;
  busy: boolean;
  request: (path: string, init: RequestInit) => Promise<void>;
}) {
  return (
    <details>
      <summary className="cursor-pointer font-semibold">
        Season {season.seasonNumber}
        {season.title ? ` · ${season.title}` : ""}
      </summary>
      <form
        className="mt-3 grid gap-2 sm:grid-cols-[7rem_1fr_1fr_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void request(`/series/${seriesId}/seasons/${season.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              seasonNumber: Number(data.get("seasonNumber")),
              title: String(data.get("title") || "") || null,
              description: String(data.get("description") || ""),
            }),
          });
        }}
      >
        <input
          required
          min={1}
          type="number"
          name="seasonNumber"
          aria-label="시즌 번호 수정"
          defaultValue={season.seasonNumber}
          className="rounded-lg border border-line bg-background px-3 py-2"
        />
        <input
          name="title"
          aria-label="시즌 제목 수정"
          defaultValue={season.title ?? ""}
          className="rounded-lg border border-line bg-background px-3 py-2"
        />
        <input
          name="description"
          aria-label="시즌 설명 수정"
          defaultValue={season.description}
          className="rounded-lg border border-line bg-background px-3 py-2"
        />
        <button
          disabled={busy}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-line px-3 text-sm"
        >
          <Pencil className="size-3" /> 저장
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void request(`/series/${seriesId}/seasons/${season.id}`, {
              method: "DELETE",
            })
          }
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-line px-3 text-sm text-red-700"
        >
          <Trash2 className="size-3" /> 삭제
        </button>
      </form>
    </details>
  );
}

function EpisodeEditor({
  series,
  episode,
  busy,
  request,
}: {
  series: ManagedSeries;
  episode: Episode;
  busy: boolean;
  request: (path: string, init: RequestInit) => Promise<void>;
}) {
  return (
    <details className="rounded-xl border border-line bg-background p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-muted">
              EP.{episode.episodeNumber}
              {episode.seasonEpisodeNumber
                ? ` · S.EP.${episode.seasonEpisodeNumber}`
                : ""}
            </span>
            <h4 className="font-semibold">{episode.title}</h4>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>{episode.mediaStatus}</span>
            <span className="rounded-full border border-line px-2 py-1">
              {episode.isPublished ? "공개" : "초안"}
            </span>
          </div>
        </div>
      </summary>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const seasonId = String(data.get("seasonId") || "") || null;
          void request(`/series/${series.id}/episodes/${episode.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              title: data.get("title"),
              synopsis: data.get("synopsis"),
              episodeNumber: Number(data.get("episodeNumber")),
              seasonId,
              seasonEpisodeNumber: seasonId
                ? Number(data.get("seasonEpisodeNumber")) || null
                : null,
            }),
          });
        }}
      >
        <input
          required
          name="title"
          aria-label={`${episode.title} 제목`}
          defaultValue={episode.title}
          className="rounded-lg border border-line px-3 py-2"
        />
        <input
          required
          min={1}
          type="number"
          name="episodeNumber"
          aria-label={`${episode.title} 전체 번호`}
          defaultValue={episode.episodeNumber}
          className="rounded-lg border border-line px-3 py-2"
        />
        <select
          name="seasonId"
          aria-label={`${episode.title} 시즌`}
          defaultValue={episode.seasonId ?? ""}
          className="rounded-lg border border-line px-3 py-2"
        >
          <option value="">시즌 없음</option>
          {series.seasons.map((season) => (
            <option key={season.id} value={season.id}>
              Season {season.seasonNumber} {season.title ?? ""}
            </option>
          ))}
        </select>
        <input
          min={1}
          type="number"
          name="seasonEpisodeNumber"
          aria-label={`${episode.title} 시즌 내 번호`}
          defaultValue={episode.seasonEpisodeNumber ?? ""}
          className="rounded-lg border border-line px-3 py-2"
        />
        <textarea
          name="synopsis"
          aria-label={`${episode.title} 시놉시스`}
          defaultValue={episode.synopsis}
          className="min-h-24 rounded-lg border border-line p-3 sm:col-span-2"
        />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            disabled={busy}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-background"
          >
            Episode 저장
          </button>
          {!episode.isPublished && series.publicationStatus === "PUBLISHED" && (
            <button
              type="button"
              disabled={busy || episode.mediaStatus !== "READY"}
              onClick={() =>
                void request(`/series/episodes/${episode.id}/publish`, {
                  method: "POST",
                })
              }
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
            >
              공개
            </button>
          )}
          {episode.isPublished && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void request(`/series/episodes/${episode.id}/unpublish`, {
                  method: "POST",
                })
              }
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
            >
              공개 취소
            </button>
          )}
        </div>
      </form>
    </details>
  );
}
