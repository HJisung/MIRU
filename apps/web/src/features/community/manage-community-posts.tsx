"use client";

import type { CommunityCategoryList } from "@stream/api-contract";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, LoaderCircle, Save } from "lucide-react";
import { clientApi } from "@/lib/client-api";

type ManagedPost = {
  id: string;
  type: "TEXT" | "IMAGE" | "VIDEO" | "LINK";
  body: string;
  linkUrl: string | null;
  status: string;
  category: null | { slug: string; name: string };
};

export function ManageCommunityPosts() {
  const [posts, setPosts] = useState<ManagedPost[]>([]);
  const [categories, setCategories] = useState<CommunityCategoryList>({
    items: [],
  });
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void Promise.all([
      clientApi<{ items: ManagedPost[] }>("/community-posts/mine"),
      clientApi<CommunityCategoryList>("/community-categories"),
    ])
      .then(([mine, available]) => {
        setPosts(mine.items);
        setCategories(available);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "불러오지 못했습니다."),
      );
  }, []);

  async function save(post: ManagedPost, form: HTMLFormElement) {
    const data = new FormData(form);
    setBusyId(post.id);
    setMessage("");
    try {
      const updated = await clientApi<ManagedPost>(`/community-posts/${post.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: String(data.get("body") ?? ""),
          categorySlug: String(data.get("categorySlug") ?? "") || null,
          ...(post.type === "LINK"
            ? { linkUrl: String(data.get("linkUrl") ?? "") }
            : {}),
        }),
      });
      setPosts((items) => items.map((item) => (item.id === post.id ? updated : item)));
      setMessage("수정했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "수정하지 못했습니다.");
    } finally {
      setBusyId("");
    }
  }

  async function archive(post: ManagedPost) {
    setBusyId(post.id);
    setMessage("");
    try {
      const updated = await clientApi<ManagedPost>(
        `/community-posts/${post.id}/archive`,
        { method: "POST" },
      );
      setPosts((items) => items.map((item) => (item.id === post.id ? updated : item)));
      setMessage("보관 처리했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "보관하지 못했습니다.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 pb-24 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-accent">POST</p>
          <h1 className="mt-2 text-3xl font-semibold">내 포스트 관리</h1>
        </div>
        <Link href="/create" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-background">
          새 포스트
        </Link>
      </div>
      {message && <p role="status" className="mt-5 rounded-xl bg-panel p-3 text-sm">{message}</p>}
      <div className="mt-7 space-y-5">
        {posts.map((post) => (
          <form
            key={post.id}
            onSubmit={(event) => {
              event.preventDefault();
              void save(post, event.currentTarget);
            }}
            className="space-y-4 rounded-2xl border border-line bg-panel-strong p-5"
          >
            <div className="flex items-center justify-between text-sm">
              <strong>{typeLabel(post.type)}</strong>
              <span className="text-muted">
                {post.status === "PUBLISHED" ? "공개" : "보관됨"}
              </span>
            </div>
            <textarea
              name="body"
              defaultValue={post.body}
              disabled={post.status !== "PUBLISHED"}
              maxLength={2200}
              rows={5}
              className="w-full rounded-xl border border-line bg-background p-3"
            />
            {post.type === "LINK" && (
              <input
                name="linkUrl"
                type="url"
                required
                defaultValue={post.linkUrl ?? ""}
                disabled={post.status !== "PUBLISHED"}
                className="w-full rounded-xl border border-line bg-background p-3"
              />
            )}
            <select
              name="categorySlug"
              defaultValue={post.category?.slug ?? ""}
              disabled={post.status !== "PUBLISHED"}
              className="w-full rounded-xl border border-line bg-background p-3"
            >
              <option value="">Post Home</option>
              {categories.items.map((category) => (
                <option key={category.id} value={category.slug}>{category.name}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              {post.status === "PUBLISHED" && (
                <>
                  <button disabled={busyId === post.id} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-background disabled:opacity-50">
                    {busyId === post.id ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                    저장
                  </button>
                  <button
                    type="button"
                    disabled={busyId === post.id}
                    onClick={() => void archive(post)}
                    className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    <Archive className="size-4" /> 보관
                  </button>
                  <Link href={`/posts/${post.id}`} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold">공개 보기</Link>
                </>
              )}
            </div>
          </form>
        ))}
        {posts.length === 0 && !message && <p className="py-12 text-center text-sm text-muted">작성한 포스트가 없습니다.</p>}
      </div>
    </main>
  );
}

function typeLabel(type: ManagedPost["type"]) {
  return {
    TEXT: "텍스트",
    IMAGE: "이미지",
    VIDEO: "동영상",
    LINK: "링크",
  }[type];
}
