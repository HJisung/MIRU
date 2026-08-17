"use client";

import type { ManagedSeries } from "@stream/api-contract";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";
import { Decision, nextAction, StatusBadge } from "./series-status";
import { EpisodicContentManager } from "./episodic-content-manager";

export function NewSeriesForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const created = await clientApi<ManagedSeries>("/series", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          synopsis: form.get("synopsis"),
          description: form.get("description"),
          workType: form.get("workType"),
          genres: split(form.get("genres")),
          tags: split(form.get("tags")),
          ageRating: form.get("ageRating") || null,
          releaseDate: form.get("releaseDate") || null,
          productionInfo: form.get("studio")
            ? { studio: form.get("studio") }
            : undefined,
        }),
      });
      router.push(`/studio/series/${created.id}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "저장하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <SeriesForm
      title="새 Series 만들기"
      onSubmit={submit}
      pending={pending}
      error={error}
    />
  );
}

export function SeriesEditor({ seriesId }: { seriesId: string }) {
  const [series, setSeries] = useState<ManagedSeries | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(
    () =>
      clientApi<ManagedSeries>(`/series/${seriesId}/manage`)
        .then(setSeries)
        .catch((caught: unknown) =>
          setError(
            caught instanceof Error ? caught.message : "불러오지 못했습니다.",
          ),
        ),
    [seriesId],
  );
  useEffect(() => {
    void load();
  }, [load]);

  async function action(path: string) {
    setPending(true);
    setError("");
    try {
      await clientApi(path, { method: "POST" });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "처리하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await clientApi(`/series/${seriesId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          synopsis: form.get("synopsis"),
          description: form.get("description"),
          genres: split(form.get("genres")),
          tags: split(form.get("tags")),
          ageRating: form.get("ageRating") || null,
          releaseDate: form.get("releaseDate") || null,
          productionInfo: form.get("studio")
            ? { studio: form.get("studio") }
            : undefined,
        }),
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "저장하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!series) return <Loading error={error} />;
  const submitted = series.latestSubmission?.status === "SUBMITTED";
  const approved = series.latestSubmission?.status === "APPROVED";
  const editable = series.publicationStatus === "DRAFT" && !approved;
  const studio =
    (series.productionInfo as { studio?: string } | null)?.studio ?? "";

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <Link
        href="/studio/series"
        className="flex items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft className="size-4" /> 내 Series
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">{series.title}</h1>
            <StatusBadge series={series} />
          </div>
          <p className="mt-2 text-sm text-muted">{nextAction(series)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {series.canManageContent &&
            series.workType === "SINGLE_WORK" &&
            !series.hasPlayableContent && (
              <Link
                href={`/create?type=${series.workType === "SINGLE_WORK" ? "series-single" : "series-episode"}&seriesId=${series.id}`}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
              >
                영상 연결
              </Link>
            )}
          {!series.latestSubmission && (
            <Action
              disabled={pending}
              onClick={() => action(`/series/${series.id}/submissions`)}
            >
              심사 신청
            </Action>
          )}
          {series.latestSubmission?.status === "REJECTED" ||
          series.latestSubmission?.status === "WITHDRAWN" ? (
            <Action
              disabled={pending}
              onClick={() => action(`/series/${series.id}/submissions`)}
            >
              다시 심사 신청
            </Action>
          ) : null}
          {submitted && (
            <Action
              disabled={pending}
              onClick={() =>
                action(
                  `/series/${series.id}/submissions/${series.latestSubmission!.id}/withdraw`,
                )
              }
            >
              심사 철회
            </Action>
          )}
          {series.canManageContent &&
            series.hasPlayableContent &&
            series.publicationStatus !== "PUBLISHED" && (
              <Action
                disabled={pending}
                onClick={() => action(`/series/${series.id}/publish`)}
              >
                Series 공개
              </Action>
            )}
        </div>
      </div>
      <Decision submission={series.latestSubmission ?? undefined} />
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <form
        onSubmit={save}
        className="mt-8 grid gap-5 rounded-2xl border border-line bg-panel-strong p-6 sm:grid-cols-2"
      >
        <Field
          label="제목"
          name="title"
          defaultValue={series.title}
          disabled={!editable}
        />
        <label className="text-sm font-medium">
          작품 유형
          <input
            value={
              series.workType === "SINGLE_WORK"
                ? "한 편의 작품"
                : "에피소드 작품"
            }
            disabled
            className="mt-2 h-11 w-full rounded-xl border border-line bg-panel px-3"
          />
        </label>
        <Field
          label="소개"
          name="description"
          defaultValue={series.description}
          disabled={!editable}
        />
        <Field
          label="제작사"
          name="studio"
          defaultValue={studio}
          disabled={!editable}
        />
        <Field
          label="장르 (쉼표 구분)"
          name="genres"
          defaultValue={series.genres.join(", ")}
          disabled={!editable}
        />
        <Field
          label="태그 (쉼표 구분)"
          name="tags"
          defaultValue={series.tags.join(", ")}
          disabled={!editable}
        />
        <Field
          label="연령 등급"
          name="ageRating"
          defaultValue={series.ageRating ?? ""}
          disabled={!editable}
        />
        <Field
          label="공개 예정일"
          name="releaseDate"
          type="date"
          defaultValue={series.releaseDate?.slice(0, 10) ?? ""}
          disabled={!editable}
        />
        <label className="text-sm font-medium sm:col-span-2">
          시놉시스
          <textarea
            name="synopsis"
            required
            defaultValue={series.synopsis}
            disabled={!editable}
            className="mt-2 min-h-32 w-full rounded-xl border border-line bg-background p-3 disabled:opacity-60"
          />
        </label>
        {editable && (
          <button
            disabled={pending}
            className="h-11 rounded-xl bg-ink px-5 text-sm font-semibold text-background sm:col-span-2"
          >
            변경사항 저장
          </button>
        )}
      </form>
      {series.workType === "EPISODIC" && (
        <EpisodicContentManager series={series} reload={load} />
      )}
    </div>
  );
}

function SeriesForm({
  title,
  onSubmit,
  pending,
  error,
}: {
  title: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  error: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link
        href="/studio/series"
        className="flex items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft className="size-4" /> 내 Series
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-5 rounded-2xl border border-line bg-panel-strong p-6 sm:grid-cols-2"
      >
        <Field label="제목" name="title" />
        <label className="text-sm font-medium">
          작품 유형
          <select
            name="workType"
            className="mt-2 h-11 w-full rounded-xl border border-line bg-background px-3"
          >
            <option value="SINGLE_WORK">한 편의 작품</option>
            <option value="EPISODIC">에피소드 작품</option>
          </select>
        </label>
        <Field label="소개" name="description" />
        <Field label="제작사" name="studio" />
        <Field label="장르 (쉼표 구분)" name="genres" />
        <Field label="태그 (쉼표 구분)" name="tags" />
        <Field label="연령 등급" name="ageRating" />
        <Field label="공개 예정일" name="releaseDate" type="date" />
        <label className="text-sm font-medium sm:col-span-2">
          시놉시스
          <textarea
            name="synopsis"
            required
            className="mt-2 min-h-32 w-full rounded-xl border border-line bg-background p-3"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        )}
        <button
          disabled={pending}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-background sm:col-span-2"
        >
          <Send className="size-4" /> 초안 저장
        </button>
      </form>
    </div>
  );
}

function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...input } = props;
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        required={input.name === "title"}
        {...input}
        className="mt-2 h-11 w-full rounded-xl border border-line bg-background px-3 disabled:opacity-60"
      />
    </label>
  );
}
function Action({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
    >
      {children}
    </button>
  );
}
function Loading({ error }: { error: string }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 text-sm text-muted">
      {error || "Series를 불러오는 중…"}
      {error && (
        <Link href="/auth" className="ml-2 underline">
          로그인
        </Link>
      )}
    </div>
  );
}
function split(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
