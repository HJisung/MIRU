"use client";

import type {
  ModerationReportDetail,
  ModerationReportList,
} from "@stream/api-contract";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";

const states = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;

export function ModerationAdmin({ reportId }: { reportId?: string }) {
  const [status, setStatus] = useState<(typeof states)[number]>("OPEN");
  const [list, setList] = useState<ModerationReportList | null>(null);
  const [detail, setDetail] = useState<ModerationReportDetail | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [confirmRemoval, setConfirmRemoval] = useState(false);

  useEffect(() => {
    void clientApi<{ role: string }>("/auth/session")
      .then((session) => {
        if (session.role !== "ADMIN" && session.role !== "MODERATOR") {
          throw new Error("MODERATOR 또는 ADMIN 권한이 필요합니다.");
        }
        if (reportId) {
          return clientApi<ModerationReportDetail>(
            `/moderation/reports/${reportId}`,
          ).then(setDetail);
        }
        return clientApi<ModerationReportList>(
          `/moderation/reports?status=${status}`,
        ).then(setList);
      })
      .catch(showError);
  }, [reportId, status]);

  function showError(caught: unknown) {
    setError(
      caught instanceof Error ? caught.message : "요청을 처리하지 못했습니다.",
    );
  }

  async function act(action: "review" | "dismiss" | "remove-content") {
    if (!detail) return;
    setError("");
    try {
      const updated = await clientApi<ModerationReportDetail>(
        `/moderation/reports/${detail.id}/${action}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ note }),
        },
      );
      setDetail(updated);
      setNote("");
      setConfirmRemoval(false);
    } catch (caught) {
      showError(caught);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <nav className="flex gap-4 text-sm text-muted">
        <Link href="/admin/series-reviews">Series Reviews</Link>
        <Link href="/admin/moderation" className="font-semibold text-ink">
          Moderation
        </Link>
      </nav>
      <p className="mt-7 text-xs font-bold tracking-[0.2em] text-accent">
        ADMIN · MODERATION
      </p>
      <h1 className="mt-2 text-3xl font-semibold">신고 검토</h1>
      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {!reportId && (
        <>
          <div className="mt-7 flex flex-wrap gap-2" role="tablist">
            {states.map((item) => (
              <button
                key={item}
                role="tab"
                aria-selected={status === item}
                onClick={() => setStatus(item)}
                className={`rounded-full px-4 py-2 text-sm ${status === item ? "bg-ink text-background" : "border border-line"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <section className="mt-6 space-y-3">
            {list?.items.length === 0 && (
              <p className="rounded-2xl border border-line p-6 text-muted">
                해당 상태의 신고가 없습니다.
              </p>
            )}
            {list?.items.map((report) => (
              <Link
                key={report.id}
                href={`/admin/moderation/${report.id}`}
                className="block rounded-2xl border border-line p-5 hover:bg-panel"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{report.content.title || report.content.body.slice(0, 70)}</strong>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold">
                    {report.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {report.target.type} · {report.reason} · 신고자 @{report.reporter.handle}
                </p>
              </Link>
            ))}
          </section>
        </>
      )}
      {reportId && detail && (
        <section className="mt-8 rounded-2xl border border-line bg-panel-strong p-6">
          <Link href="/admin/moderation" className="text-sm text-muted">
            ← 신고 목록
          </Link>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">
                {detail.content.title || detail.target.type}
              </h2>
              <p className="mt-1 text-sm text-muted">
                작성자 @{detail.content.author.handle} · 신고자 @{detail.reporter.handle}
              </p>
            </div>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold">
              {detail.status}
            </span>
          </div>
          <p className="mt-6 whitespace-pre-wrap leading-7">{detail.content.body}</p>
          <div className="mt-6 rounded-xl border border-line p-4 text-sm">
            <strong>{detail.reason}</strong>
            <p className="mt-2 whitespace-pre-wrap text-muted">{detail.details || "상세 설명 없음"}</p>
          </div>
          {(detail.status === "OPEN" || detail.status === "REVIEWING") && (
            <div className="mt-6">
              <label className="text-sm font-medium">
                처리 메모
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-2 min-h-24 w-full rounded-xl border border-line bg-background p-3"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.status === "OPEN" && (
                  <button onClick={() => act("review")} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
                    검토 시작
                  </button>
                )}
                <button onClick={() => act("dismiss")} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
                  신고 기각
                </button>
                <button onClick={() => setConfirmRemoval(true)} className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white">
                  콘텐츠 공개 제거
                </button>
              </div>
              {confirmRemoval && (
                <div role="alertdialog" aria-label="콘텐츠 공개 제거 확인" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                  <p>콘텐츠를 즉시 비공개 처리하고 작성자의 재공개를 차단합니다.</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => act("remove-content")} className="rounded-full bg-red-700 px-4 py-2 font-semibold text-white">
                      제거 확인
                    </button>
                    <button onClick={() => setConfirmRemoval(false)} className="rounded-full border border-red-300 px-4 py-2 font-semibold">
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <h3 className="mt-8 text-lg font-semibold">감사 기록</h3>
          <ol className="mt-3 space-y-2">
            {detail.audit.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-line p-3 text-sm">
                <strong>{entry.action}</strong> · @{entry.actor.handle}
                <p className="mt-1 text-muted">{entry.note || "메모 없음"}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
