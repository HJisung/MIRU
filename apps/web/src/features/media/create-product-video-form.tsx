"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { LoaderCircle, UploadCloud, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";
import { waitForVideoProcessing } from "./processing-status";

type Mode = "series-single" | "series-episode" | "shortform";
type Pending = {
  assetId: string;
  mode: Mode;
  seriesId?: string;
  episodeNumber?: number;
  title?: string;
  description: string;
  musicKey?: string;
  promotedKind?: string;
  promotedId?: string;
};

export function CreateProductVideoForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const key = `miru:pending-${mode}`;
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const value = localStorage.getItem(key);
    if (!value) return;
    const timeout = window.setTimeout(
      () => setPending(JSON.parse(value) as Pending),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, [key]);

  async function finish(workflow: Pending) {
    setBusy(true);
    setMessage("영상 처리 상태를 확인하고 있습니다.");
    try {
      const result = await waitForVideoProcessing(workflow.assetId);
      if (result.status === "FAILED")
        throw new Error(
          `영상 처리 실패: ${result.failureCode ?? "알 수 없음"}`,
        );
      if (result.status === "TIMEOUT") {
        setMessage("아직 처리 중입니다. 잠시 후 다시 확인할 수 있습니다.");
        return;
      }
      if (workflow.mode === "series-single") {
        await clientApi(`/series/${workflow.seriesId}/single-work/video`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ assetId: workflow.assetId }),
        });
        localStorage.removeItem(key);
        router.push(`/watch/series/${workflow.seriesId}`);
      } else if (workflow.mode === "series-episode") {
        const draft = await clientApi<{ id: string }>(
          `/series/${workflow.seriesId}/episodes`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              assetId: workflow.assetId,
              episodeNumber: workflow.episodeNumber,
              title: workflow.title,
              synopsis: workflow.description,
            }),
          },
        );
        await clientApi(`/series/episodes/${draft.id}/publish`, {
          method: "POST",
        });
        localStorage.removeItem(key);
        router.push(`/watch/episode/${draft.id}`);
      } else {
        const draft = await clientApi<{ id: string }>(`/shortforms/videos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            assetId: workflow.assetId,
            title: workflow.title,
            description: workflow.description,
            musicKey: workflow.musicKey || undefined,
            promotedKind: workflow.promotedKind || undefined,
            promotedId: workflow.promotedId || undefined,
          }),
        });
        await clientApi(`/shortforms/${draft.id}/publish`, { method: "POST" });
        localStorage.removeItem(key);
        router.push(`/shorts`);
      }
      setPending(null);
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
        seriesId: String(data.get("seriesId") || "") || undefined,
        episodeNumber: Number(data.get("episodeNumber")) || undefined,
        title: String(data.get("title") || "") || undefined,
        description: String(data.get("description") || ""),
        musicKey: String(data.get("musicKey") || "") || undefined,
        promotedKind: String(data.get("promotedKind") || "") || undefined,
        promotedId: String(data.get("promotedId") || "") || undefined,
      };
      localStorage.setItem(key, JSON.stringify(workflow));
      setPending(workflow);
      await finish(workflow);
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
          처리 상태 다시 확인
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
            placeholder="Series UUID"
            className="w-full rounded-xl border border-line bg-background p-4"
          />
        )}
        {mode === "series-episode" && (
          <input
            required
            min={1}
            type="number"
            name="episodeNumber"
            placeholder="에피소드 번호"
            className="w-full rounded-xl border border-line bg-background p-4"
          />
        )}
        {mode !== "series-single" && (
          <input
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
