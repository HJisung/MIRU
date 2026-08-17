"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  UploadCloud,
} from "lucide-react";
import { clientApi } from "@/lib/client-api";

type Stage = "idle" | "signing" | "uploading" | "verifying" | "publishing";

export function CreateCommunityPostForm({
  categorySlug,
}: {
  categorySlug?: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(next ? URL.createObjectURL(next) : "");
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setError("게시할 이미지를 선택해 주세요.");
    const caption = String(
      new FormData(event.currentTarget).get("caption") ?? "",
    );
    try {
      setError("");
      setStage("signing");
      const session = await clientApi<{
        assetId: string;
        uploadUrl: string;
        requiredHeaders: Record<string, string>;
      }>("/media/image-uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type, byteSize: file.size }),
      });
      setStage("uploading");
      const stored = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: session.requiredHeaders,
        body: file,
      });
      if (!stored.ok) throw new Error("스토리지 업로드에 실패했습니다.");
      setStage("verifying");
      await clientApi(`/media/assets/${session.assetId}/complete`, {
        method: "POST",
      });
      setStage("publishing");
      const post = await clientApi<{ id: string }>("/community-posts/images", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId: session.assetId,
          caption,
          categorySlug,
        }),
      });
      router.push(`/posts/${post.id}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "게시하지 못했습니다.",
      );
      setStage("idle");
    }
  }

  const busy = stage !== "idle";
  const stageLabel = {
    idle: "게시하기",
    signing: "업로드 준비 중",
    uploading: "스토리지에 업로드 중",
    verifying: "이미지 안전성 확인 중",
    publishing: "게시물 발행 중",
  }[stage];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 pb-28 sm:px-8">
      <div className="mb-8">
        <Link
          href="/create?type=video"
          className="float-right rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          Home 영상 업로드
        </Link>
        <p className="text-xs font-bold tracking-[0.18em] text-accent">
          CREATE
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          {categorySlug ? `${categorySlug}에 게시` : "Post Home에 게시"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          원본은 브라우저에서 스토리지로 바로 전송되고 서버가 실제 파일을 다시
          검증합니다.
        </p>
      </div>
      <form
        onSubmit={publish}
        className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr]"
      >
        <label className="relative grid min-h-[28rem] cursor-pointer place-items-center overflow-hidden rounded-[1.75rem] border border-dashed border-line bg-panel transition hover:border-accent">
          {preview ? (
            <Image
              src={preview}
              alt="업로드 미리보기"
              fill
              unoptimized
              className="object-contain p-3"
            />
          ) : (
            <span className="grid place-items-center text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent">
                <ImagePlus className="size-7" />
              </span>
              <strong className="mt-5 text-lg">이미지를 선택하세요</strong>
              <span className="mt-2 text-sm text-muted">
                JPEG, PNG, WebP · 최대 20MB
              </span>
            </span>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={choose}
            className="sr-only"
          />
        </label>
        <div className="rounded-[1.75rem] border border-line bg-panel-strong p-6 sm:p-8">
          <label className="text-sm font-semibold">
            캡션
            <textarea
              name="caption"
              maxLength={2200}
              rows={8}
              placeholder="이 장면의 이야기를 들려주세요…"
              className="mt-3 w-full resize-none rounded-xl border border-line bg-background p-4 text-sm leading-6 outline-none focus:border-accent"
            />
          </label>
          {file && (
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#edf0e7] p-3 text-xs text-black">
              <CheckCircle2 className="size-4 text-green-700" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <button
            disabled={busy || !file}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-background disabled:opacity-40"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <UploadCloud className="size-4" />
            )}
            {stageLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
