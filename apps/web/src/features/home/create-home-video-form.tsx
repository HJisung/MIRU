"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle, UploadCloud, Video } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { waitForVideoProcessing } from "@/features/media/processing-status";

const pendingKey = "miru:pending-home-video";
type Pending = { assetId: string; draftId: string; mediaReady: boolean };

type Stage =
  | "idle"
  | "signing"
  | "uploading"
  | "queueing"
  | "processing"
  | "publishing";

export function CreateHomeVideoForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(pendingKey);
    if (!stored) return;
    const timeout = window.setTimeout(() => {
      try {
        const workflow = JSON.parse(stored) as Pending;
        if (workflow.assetId && workflow.draftId) setPending(workflow);
        else localStorage.removeItem(pendingKey);
      } catch {
        localStorage.removeItem(pendingKey);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function finish(current: Pending) {
    setStage("processing");
    setError("");
    let workflow = current;
    if (!workflow.mediaReady) {
      const result = await waitForVideoProcessing(workflow.assetId);
      if (result.status === "FAILED") {
        localStorage.removeItem(pendingKey);
        setPending(null);
        throw new Error(
          `영상 처리 실패: ${result.failureCode ?? "알 수 없는 오류"}`,
        );
      }
      if (result.status === "TIMEOUT") {
        setStage("idle");
        setError(
          "아직 처리 중입니다. 잠시 후 ‘처리 상태 다시 확인’을 눌러주세요.",
        );
        return;
      }
      workflow = { ...workflow, mediaReady: true };
      localStorage.setItem(pendingKey, JSON.stringify(workflow));
      setPending(workflow);
    }
    setStage("publishing");
    await clientApi(`/home/videos/${workflow.draftId}/publish`, {
      method: "POST",
    });
    localStorage.removeItem(pendingKey);
    setPending(null);
    router.push(`/watch/home/${workflow.draftId}`);
    router.refresh();
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const data = new FormData(event.currentTarget);
    try {
      setStage("signing");
      const session = await clientApi<{
        assetId: string;
        uploadUrl: string;
        requiredHeaders: Record<string, string>;
      }>("/media/video-uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type, byteSize: file.size }),
      });
      setStage("uploading");
      const uploaded = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: session.requiredHeaders,
        body: file,
      });
      if (!uploaded.ok) throw new Error("스토리지 업로드에 실패했습니다.");
      setStage("queueing");
      await clientApi(`/media/video-assets/${session.assetId}/complete`, {
        method: "POST",
      });
      const draft = await clientApi<{ id: string }>("/home/videos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId: session.assetId,
          title: String(data.get("title") ?? ""),
          description: String(data.get("description") ?? ""),
        }),
      });
      const current = {
        assetId: session.assetId,
        draftId: draft.id,
        mediaReady: false,
      };
      localStorage.setItem(pendingKey, JSON.stringify(current));
      setPending(current);
      await finish(current);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "영상을 처리하지 못했습니다.",
      );
      setStage("idle");
    }
  }

  const labels: Record<Stage, string> = {
    idle: "업로드",
    signing: "업로드 준비 중",
    uploading: "스토리지 업로드 중",
    queueing: "처리 요청 중",
    processing: "FFmpeg 처리 중",
    publishing: "공개 중",
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="업로드 유형" className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/create?type=shortform-video"
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          Shortform
        </Link>
        <Link
          href="/create?type=series-single"
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          Series 단편
        </Link>
        <Link
          href="/create?type=series-episode"
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          Series 에피소드
        </Link>
        <Link
          href="/create"
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          Post 이미지
        </Link>
      </nav>
      <h1 className="text-3xl font-semibold">Home 영상 업로드</h1>
      <p className="mt-2 text-sm text-muted">
        MP4, MOV, WebM · 최대 500MB · 처리 완료 후 자동 공개됩니다.
      </p>
      {pending && stage === "idle" && (
        <button
          type="button"
          onClick={() => void finish(pending).catch(handleError)}
          className="mt-5 rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          처리 상태 다시 확인
        </button>
      )}
      <form
        onSubmit={submit}
        className="mt-8 space-y-5 rounded-3xl border border-line bg-panel-strong p-6"
      >
        <label className="grid min-h-48 cursor-pointer place-items-center rounded-2xl border border-dashed border-line bg-panel">
          <span className="text-center">
            <Video className="mx-auto size-8" />
            <strong className="mt-3 block">{file?.name ?? "영상 선택"}</strong>
          </span>
          <input
            className="sr-only"
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={choose}
          />
        </label>
        <input
          name="title"
          required
          maxLength={160}
          placeholder="제목"
          className="w-full rounded-xl border border-line bg-background p-4"
        />
        <textarea
          name="description"
          maxLength={5000}
          placeholder="설명"
          rows={5}
          className="w-full rounded-xl border border-line bg-background p-4"
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          disabled={!file || stage !== "idle"}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-background disabled:opacity-40"
        >
          {stage === "idle" ? (
            <UploadCloud className="size-4" />
          ) : (
            <LoaderCircle className="size-4 animate-spin" />
          )}
          {labels[stage]}
        </button>
      </form>
    </div>
  );

  function handleError(caught: unknown) {
    setError(
      caught instanceof Error ? caught.message : "영상을 처리하지 못했습니다.",
    );
    setStage("idle");
  }
}
