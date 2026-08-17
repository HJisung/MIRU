"use client";

import type {
  AdminSeriesSubmission,
  AdminSeriesSubmissionList,
} from "@stream/api-contract";
import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";

export function AdminSeriesReviews() {
  const [data, setData] = useState<AdminSeriesSubmissionList | null>(null);
  const [selected, setSelected] = useState<AdminSeriesSubmission | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    clientApi<AdminSeriesSubmissionList>("/admin/series-submissions")
      .then((next) => {
        setData(next);
        setSelected(
          (current) =>
            next.items.find((item) => item.id === current?.id) ??
            next.items[0] ??
            null,
        );
      })
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "심사 목록을 불러오지 못했습니다.",
        ),
      );
  useEffect(() => {
    void load();
  }, []);

  async function decide(decision: "approve" | "reject") {
    if (!selected) return;
    setError("");
    try {
      await clientApi(`/admin/series-submissions/${selected.id}/${decision}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      setReason("");
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "처리하지 못했습니다.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <Link
        href="/studio/series"
        className="flex items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft className="size-4" /> Creator Studio
      </Link>
      <p className="mt-6 text-xs font-bold tracking-[0.2em] text-accent">
        ADMIN
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Series 심사</h1>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-2">
          {data?.items.length === 0 && (
            <p className="rounded-2xl border border-line p-6 text-sm text-muted">
              대기 중인 심사가 없습니다.
            </p>
          )}
          {data?.items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className={`w-full rounded-2xl border p-4 text-left ${selected?.id === item.id ? "border-ink bg-panel-strong" : "border-line"}`}
            >
              <strong className="block">{item.series.title}</strong>
              <span className="mt-1 block text-xs text-muted">
                {item.applicant.displayName} · {item.series.workType}
              </span>
            </button>
          ))}
        </section>
        {selected && (
          <section className="rounded-2xl border border-line bg-panel-strong p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">
                {selected.series.title}
              </h2>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold">
                심사 중
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              신청자 {selected.applicant.displayName} (@
              {selected.applicant.handle})
            </p>
            <p className="mt-6 whitespace-pre-wrap leading-7">
              {selected.series.synopsis}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">유형</dt>
                <dd className="font-semibold">{selected.series.workType}</dd>
              </div>
              <div>
                <dt className="text-muted">장르</dt>
                <dd className="font-semibold">
                  {selected.series.genres.join(", ") || "미지정"}
                </dd>
              </div>
            </dl>
            <label className="mt-7 block text-sm font-medium">
              심사 의견
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={5}
                className="mt-2 min-h-28 w-full rounded-xl border border-line bg-background p-3"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                disabled={reason.trim().length < 5}
                onClick={() => decide("approve")}
                className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
              >
                <Check className="size-4" /> 승인
              </button>
              <button
                disabled={reason.trim().length < 5}
                onClick={() => decide("reject")}
                className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                <X className="size-4" /> 반려
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
