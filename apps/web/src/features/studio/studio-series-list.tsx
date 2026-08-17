"use client";

import type { ManagedSeriesList } from "@stream/api-contract";
import { ArrowRight, CirclePlus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";
import { Decision, nextAction, StatusBadge } from "./series-status";

export function StudioSeriesList() {
  const [data, setData] = useState<ManagedSeriesList | null>(null);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    clientApi<ManagedSeriesList>("/series/mine")
      .then(setData)
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "불러오지 못했습니다.",
        ),
      );
    clientApi<{ role: string }>("/auth/session")
      .then((session) => setIsAdmin(session.role === "ADMIN"))
      .catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-accent">
            CREATOR STUDIO
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            내 Series
          </h1>
          <p className="mt-2 text-sm text-muted">
            작품 초안부터 심사, 콘텐츠 연결과 공개까지 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link
              href="/admin/series-reviews"
              className="flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold"
            >
              <ShieldCheck className="size-4" /> 관리자 심사
            </Link>
          )}
          <Link
            href="/studio/series/new"
            className="flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-background"
          >
            <CirclePlus className="size-4" /> 새 Series
          </Link>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-8 rounded-2xl border border-line bg-panel p-5 text-sm"
        >
          {error}{" "}
          <Link href="/auth" className="ml-2 font-semibold underline">
            로그인하기
          </Link>
        </div>
      )}
      {data && data.items.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center text-muted">
          아직 만든 Series가 없습니다.
        </div>
      )}
      <div className="mt-8 grid gap-4">
        {data?.items.map((series) => (
          <Link
            key={series.id}
            href={`/studio/series/${series.id}`}
            className="group rounded-2xl border border-line bg-panel-strong p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{series.title}</h2>
                  <StatusBadge series={series} />
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {series.workType === "SINGLE_WORK"
                    ? "한 편의 작품"
                    : "에피소드 작품"}
                </p>
                <p className="mt-3 text-sm text-muted">{nextAction(series)}</p>
                <Decision submission={series.latestSubmission ?? undefined} />
              </div>
              <ArrowRight className="mt-1 size-5 text-muted transition group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
