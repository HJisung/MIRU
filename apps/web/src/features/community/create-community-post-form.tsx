"use client";

import type { CommunityCategoryList } from "@stream/api-contract";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  ImagePlus,
  Link2,
  LoaderCircle,
  UploadCloud,
  Video,
} from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { waitForVideoProcessing } from "@/features/media/processing-status";

type PostType = "TEXT" | "IMAGE" | "VIDEO" | "LINK";
type Stage =
  | "idle"
  | "signing"
  | "uploading"
  | "verifying"
  | "processing"
  | "publishing";
type PendingVideo = {
  assetId: string;
  creationId: string;
  body: string;
  categorySlug?: string;
};

const pendingVideoKey = "miru:pending-community-video";

export function CreateCommunityPostForm({
  categorySlug,
}: {
  categorySlug?: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<PostType>("TEXT");
  const [file, setFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(categorySlug ?? "");
  const [categories, setCategories] = useState<CommunityCategoryList>({
    items: [],
  });
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingVideo | null>(null);

  useEffect(() => {
    void clientApi<CommunityCategoryList>("/community-categories")
      .then(setCategories)
      .catch(() => undefined);
    const stored = localStorage.getItem(pendingVideoKey);
    if (!stored) return;
    const timeout = window.setTimeout(() => {
      try {
        const workflow = JSON.parse(stored) as PendingVideo;
        if (workflow.assetId && workflow.creationId) setPending(workflow);
        else localStorage.removeItem(pendingVideoKey);
      } catch {
        localStorage.removeItem(pendingVideoKey);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function finishVideo(workflow: PendingVideo) {
    setStage("processing");
    setError("");
    const result = await waitForVideoProcessing(workflow.assetId);
    if (result.status === "FAILED") {
      localStorage.removeItem(pendingVideoKey);
      setPending(null);
      throw new Error(`영상 처리 실패: ${result.failureCode ?? "알 수 없음"}`);
    }
    if (result.status === "TIMEOUT") {
      setStage("idle");
      setError("아직 처리 중입니다. 잠시 후 처리 상태를 다시 확인해 주세요.");
      return;
    }
    setStage("publishing");
    const post = await clientApi<{ id: string }>("/community-posts/video", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(workflow),
    });
    localStorage.removeItem(pendingVideoKey);
    setPending(null);
    router.push(`/posts/${post.id}`);
    router.refresh();
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = String(data.get("body") ?? "");
    const selectedCategory = String(data.get("categorySlug") ?? "") || undefined;
    const creationId = crypto.randomUUID();
    try {
      setError("");
      if (type === "TEXT" || type === "LINK") {
        setStage("publishing");
        const post = await clientApi<{ id: string }>(
          `/community-posts/${type.toLowerCase()}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              creationId,
              body,
              categorySlug: selectedCategory,
              ...(type === "LINK"
                ? { linkUrl: String(data.get("linkUrl") ?? "") }
                : {}),
            }),
          },
        );
        router.push(`/posts/${post.id}`);
        router.refresh();
        return;
      }
      if (!file)
        throw new Error(
          type === "IMAGE"
            ? "게시할 이미지를 선택해 주세요."
            : "게시할 동영상을 선택해 주세요.",
        );
      setStage("signing");
      const isVideo = type === "VIDEO";
      const session = await clientApi<{
        assetId: string;
        uploadUrl: string;
        requiredHeaders: Record<string, string>;
      }>(isVideo ? "/media/video-uploads" : "/media/image-uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          byteSize: file.size,
          ...(isVideo ? { purpose: "POST_VIDEO" } : {}),
        }),
      });
      setStage("uploading");
      const uploaded = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: session.requiredHeaders,
        body: file,
      });
      if (!uploaded.ok) throw new Error("스토리지 업로드에 실패했습니다.");
      setStage("verifying");
      await clientApi(
        isVideo
          ? `/media/video-assets/${session.assetId}/complete`
          : `/media/assets/${session.assetId}/complete`,
        { method: "POST" },
      );
      if (isVideo) {
        const workflow = {
          assetId: session.assetId,
          creationId,
          body,
          categorySlug: selectedCategory,
        };
        localStorage.setItem(pendingVideoKey, JSON.stringify(workflow));
        setPending(workflow);
        await finishVideo(workflow);
        return;
      }
      setStage("publishing");
      const post = await clientApi<{ id: string }>("/community-posts/image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creationId,
          assetId: session.assetId,
          caption: body,
          categorySlug: selectedCategory,
        }),
      });
      router.push(`/posts/${post.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "게시하지 못했습니다.");
      setStage("idle");
    }
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError("");
  }

  const busy = stage !== "idle";
  const labels: Record<Stage, string> = {
    idle: "게시하기",
    signing: "업로드 준비 중",
    uploading: "스토리지 업로드 중",
    verifying: "파일 확인 중",
    processing: "영상 처리 중",
    publishing: "게시 중",
  };
  const tabs = [
    ["TEXT", "텍스트", FileText],
    ["IMAGE", "이미지", ImagePlus],
    ["VIDEO", "동영상", Video],
    ["LINK", "링크", Link2],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-24 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-accent">POST</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Post 만들기
          </h1>
        </div>
        <Link
          href="/posts/manage"
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          내 포스트 관리
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist">
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={type === value}
            onClick={() => {
              setType(value);
              setFile(null);
              setError("");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${type === value ? "border-ink bg-ink text-background" : "border-line bg-panel"}`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
      {pending && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void finishVideo(pending).catch(handleError)}
          className="mt-5 rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          동영상 처리 상태 다시 확인
        </button>
      )}
      <form
        onSubmit={publish}
        className="mt-6 space-y-5 rounded-3xl border border-line bg-panel-strong p-5 sm:p-7"
      >
        <label className="block text-sm font-semibold">
          카테고리
          <select
            name="categorySlug"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-background p-3"
          >
            <option value="">Post Home</option>
            {categories.items.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          본문{type === "TEXT" ? " (필수)" : ""}
          <textarea
            name="body"
            required={type === "TEXT"}
            maxLength={2200}
            rows={7}
            placeholder={type === "LINK" ? "링크에 덧붙일 이야기 (선택)" : "이야기를 입력하세요…"}
            className="mt-2 w-full resize-y rounded-xl border border-line bg-background p-4 leading-6 outline-none focus:border-accent"
          />
        </label>
        {type === "LINK" && (
          <label className="block text-sm font-semibold">
            외부 링크
            <input
              name="linkUrl"
              type="url"
              required
              maxLength={2048}
              placeholder="https://example.com"
              className="mt-2 w-full rounded-xl border border-line bg-background p-4"
            />
          </label>
        )}
        {(type === "IMAGE" || type === "VIDEO") && (
          <label className="grid min-h-44 cursor-pointer place-items-center rounded-2xl border border-dashed border-line bg-panel text-center">
            <span>
              {type === "IMAGE" ? (
                <ImagePlus className="mx-auto size-8" />
              ) : (
                <Video className="mx-auto size-8" />
              )}
              <strong className="mt-3 block">{file?.name ?? `${type === "IMAGE" ? "이미지" : "동영상"} 선택`}</strong>
              <span className="mt-1 block text-xs text-muted">
                {type === "IMAGE" ? "JPEG, PNG, WebP · 최대 20MB" : "MP4, MOV, WebM · 최대 500MB"}
              </span>
            </span>
            <input
              className="sr-only"
              type="file"
              accept={
                type === "IMAGE"
                  ? "image/jpeg,image/png,image/webp"
                  : "video/mp4,video/quicktime,video/webm"
              }
              onChange={choose}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          disabled={busy || ((type === "IMAGE" || type === "VIDEO") && !file)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-background disabled:opacity-40"
        >
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          {labels[stage]}
        </button>
      </form>
    </div>
  );

  function handleError(caught: unknown) {
    setError(caught instanceof Error ? caught.message : "처리에 실패했습니다.");
    setStage("idle");
  }
}
