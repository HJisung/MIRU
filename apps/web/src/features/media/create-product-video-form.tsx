"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { LoaderCircle, UploadCloud, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";
import { waitForVideoProcessing } from "./processing-status";

type Mode = "series-single" | "series-episode" | "shortform";
type WorkflowPhase = "PROCESSING" | "MEDIA_READY" | "PRODUCT_CREATED";
type Pending = {
  assetId: string;
  mode: Mode;
  phase: WorkflowPhase;
  productId?: string;
  seriesId?: string;
  episodeNumber?: number;
  seasonId?: string;
  seasonEpisodeNumber?: number;
  title?: string;
  description: string;
  musicKey?: string;
  promotedKind?: string;
  promotedId?: string;
};

export function CreateProductVideoForm({
  mode,
  initialSeriesId,
}: {
  mode: Mode;
  initialSeriesId?: string;
}) {
  const router = useRouter();
  const key = `miru:pending-${mode}`;
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const value = localStorage.getItem(key);
    if (!value) return;
    const timeout = window.setTimeout(() => {
      try {
        const workflow = JSON.parse(value) as Pending;
        if (workflow.assetId && workflow.mode === mode) {
          const recovered = workflow.phase
            ? workflow
            : { ...workflow, phase: "PROCESSING" as const };
          localStorage.setItem(key, JSON.stringify(recovered));
          setPending(recovered);
        } else localStorage.removeItem(key);
      } catch {
        localStorage.removeItem(key);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [key, mode]);

  function persist(workflow: Pending) {
    localStorage.setItem(key, JSON.stringify(workflow));
    setPending(workflow);
    return workflow;
  }

  function clearPending() {
    localStorage.removeItem(key);
    setPending(null);
  }

  async function finish(workflow: Pending) {
    setBusy(true);
    setMessage("영상 처리 상태를 확인하고 있습니다.");
    try {
      let current = workflow;
      if (current.phase === "PROCESSING") {
        const result = await waitForVideoProcessing(current.assetId);
        if (result.status === "FAILED") {
          clearPending();
          throw new Error(
            `영상 처리 실패: ${result.failureCode ?? "알 수 없음"}`,
          );
        }
        if (result.status === "TIMEOUT") {
          setMessage("아직 처리 중입니다. 잠시 후 다시 확인할 수 있습니다.");
          return;
        }
        current = persist({ ...current, phase: "MEDIA_READY" });
      }
      if (current.mode === "series-single") {
        const attached = await clientApi<{ id: string; status: string }>(
          `/series/${current.seriesId}/single-work/video`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ assetId: current.assetId }),
          },
        );
        persist({
          ...current,
          phase: "PRODUCT_CREATED",
          productId: attached.id,
        });
        clearPending();
        if (attached.status === "PUBLISHED") {
          router.push(`/watch/series/${attached.id}`);
          router.refresh();
        } else {
          setMessage(
            "영상 연결이 완료되었습니다. Series가 공개되기 전까지 이 화면에 유지됩니다.",
          );
        }
        return;
      }
      if (current.phase === "MEDIA_READY") {
        if (current.mode === "series-episode") {
          const draft = await clientApi<{ id: string; status: string }>(
            `/series/${current.seriesId}/episodes`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                assetId: current.assetId,
                episodeNumber: current.episodeNumber,
                seasonId: current.seasonId || undefined,
                seasonEpisodeNumber: current.seasonEpisodeNumber,
                title: current.title,
                synopsis: current.description,
              }),
            },
          );
          current = persist({
            ...current,
            phase: "PRODUCT_CREATED",
            productId: draft.id,
          });
        } else {
          const draft = await clientApi<{ id: string; status: string }>(
            `/shortforms/videos`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                assetId: current.assetId,
                title: current.title,
                description: current.description,
                musicKey: current.musicKey || undefined,
                promotedKind: current.promotedKind || undefined,
                promotedId: current.promotedId || undefined,
              }),
            },
          );
          current = persist({
            ...current,
            phase: "PRODUCT_CREATED",
            productId: draft.id,
          });
        }
      }
      if (!current.productId) {
        clearPending();
        throw new Error("생성된 콘텐츠 식별자를 복구하지 못했습니다.");
      }
      if (current.mode === "series-episode") {
        clearPending();
        router.push(`/studio/series/${current.seriesId}`);
      } else {
        await clientApi(`/shortforms/${current.productId}/publish`, {
          method: "POST",
        });
        clearPending();
        router.push(`/shorts`);
      }
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "처리에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage("업로드를 준비하고 있습니다.");
    const data = new FormData(event.currentTarget);
    try {
      const session = await clientApi<{
        assetId: string;
        uploadUrl: string;
        requiredHeaders: Record<string, string>;
      }>("/media/video-uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          byteSize: file.size,
          purpose: mode === "shortform" ? "SHORT_VIDEO" : "LONG_VIDEO",
        }),
      });
      setMessage("스토리지에 직접 업로드하고 있습니다.");
      const uploaded = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: session.requiredHeaders,
        body: file,
      });
      if (!uploaded.ok) throw new Error("스토리지 업로드에 실패했습니다.");
      await clientApi(`/media/video-assets/${session.assetId}/complete`, {
        method: "POST",
      });
      const workflow: Pending = {
        assetId: session.assetId,
        mode,
        phase: "PROCESSING",
        seriesId: String(data.get("seriesId") || "") || undefined,
        episodeNumber: Number(data.get("episodeNumber")) || undefined,
        seasonId: String(data.get("seasonId") || "") || undefined,
        seasonEpisodeNumber:
          Number(data.get("seasonEpisodeNumber")) || undefined,
        title: String(data.get("title") || "") || undefined,
        description: String(data.get("description") || ""),
        musicKey: String(data.get("musicKey") || "") || undefined,
        promotedKind: String(data.get("promotedKind") || "") || undefined,
        promotedId: String(data.get("promotedId") || "") || undefined,
      };
      await finish(persist(workflow));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "업로드에 실패했습니다.",
      );
      setBusy(false);
    }
  }

  const title =
    mode === "series-single"
      ? "Series SINGLE_WORK 영상 연결"
      : mode === "series-episode"
        ? "Series Episode 업로드"
        : "Shortform VIDEO 업로드";
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        기존 공용 MediaAsset·BullMQ·FFmpeg 파이프라인을 사용합니다.
      </p>
      {pending && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void finish(pending)}
          className="mt-5 rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          생성 작업 계속하기
        </button>
      )}
      <form
        onSubmit={submit}
        className="mt-8 space-y-4 rounded-3xl border border-line p-6"
      >
        <label className="grid min-h-40 cursor-pointer place-items-center rounded-2xl border border-dashed border-line">
          <span className="text-center">
            <Video className="mx-auto size-8" />
            {file?.name ?? "영상 선택"}
          </span>
          <input
            className="sr-only"
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFile(event.target.files?.[0] ?? null)
            }
          />
        </label>
        {mode !== "shortform" && (
          <input
            required
            name="seriesId"
            defaultValue={initialSeriesId}
            placeholder="Series UUID"
            className="w-full rounded-xl border border-line bg-background p-4"
          />
        )}
        {mode === "series-episode" && (
          <>
            <input
              required
              min={1}
              type="number"
              name="episodeNumber"
              placeholder="전체 에피소드 번호"
              className="w-full rounded-xl border border-line bg-background p-4"
            />
            <input
              name="seasonId"
              placeholder="시즌 UUID (선택, Studio에서 나중에 지정 가능)"
              className="w-full rounded-xl border border-line bg-background p-4"
            />
            <input
              min={1}
              type="number"
              name="seasonEpisodeNumber"
              placeholder="시즌 내 번호 (선택)"
              className="w-full rounded-xl border border-line bg-background p-4"
            />
          </>
        )}
        {mode !== "series-single" && (
          <input
            required={mode === "series-episode"}
            name="title"
            maxLength={160}
            placeholder="제목"
            className="w-full rounded-xl border border-line bg-background p-4"
          />
        )}
        {mode !== "series-single" && (
          <textarea
            required
            name="description"
            maxLength={mode === "shortform" ? 2200 : 5000}
            placeholder="설명"
            className="w-full rounded-xl border border-line bg-background p-4"
          />
        )}
        {mode === "shortform" && (
          <>
            <input
              name="musicKey"
              placeholder="음악 참조 (선택)"
              className="w-full rounded-xl border border-line bg-background p-4"
            />
            <select
              name="promotedKind"
              className="w-full rounded-xl border border-line bg-background p-4"
            >
              <option value="">프로모션 없음</option>
              <option value="HOME_VIDEO">Home Video</option>
              <option value="SERIES">Series</option>
              <option value="SERIES_EPISODE">Series Episode</option>
            </select>
            <input
              name="promotedId"
              placeholder="프로모션 대상 UUID (선택)"
              className="w-full rounded-xl border border-line bg-background p-4"
            />
          </>
        )}
        {message && (
          <p role="status" className="text-sm text-muted">
            {message}
          </p>
        )}
        <button
          disabled={!file || busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-background disabled:opacity-40"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <UploadCloud className="size-4" />
          )}
          업로드 및 처리
        </button>
      </form>
    </div>
  );
}
