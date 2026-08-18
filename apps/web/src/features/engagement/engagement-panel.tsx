"use client";

import type {
  EngagementComment,
  EngagementLikeState,
} from "@stream/api-contract";
import { Heart, MessageCircle, ShieldAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { clientApi } from "@/lib/client-api";

type TargetType =
  | "HOME_VIDEO"
  | "SERIES"
  | "SERIES_EPISODE"
  | "SHORTFORM"
  | "COMMUNITY_POST";

export function EngagementPanel({
  type,
  id,
  initialLikeCount,
  initialCommentCount,
}: {
  type: TargetType;
  id: string;
  initialLikeCount: number;
  initialCommentCount: number;
}) {
  const base = `/engagement/${type}/${id}`;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [comments, setComments] = useState<EngagementComment[] | null>(null);
  const [body, setBody] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleLike() {
    try {
      const state = await clientApi<EngagementLikeState>(`${base}/like`, {
        method: liked ? "DELETE" : "PUT",
      });
      setLiked(state.liked);
      setLikeCount(state.likeCount);
    } catch (error) {
      showError(error);
    }
  }

  async function loadComments() {
    try {
      setComments(await clientApi<EngagementComment[]>(`${base}/comments`));
    } catch (error) {
      showError(error);
    }
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    try {
      await clientApi(`${base}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      setBody("");
      setCommentCount((count) => count + 1);
      await loadComments();
    } catch (error) {
      showError(error);
    }
  }

  async function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await clientApi(`${base}/reports`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: form.get("reason"),
          details: form.get("details"),
        }),
      });
      setMessage("신고가 접수되었습니다.");
      setReportOpen(false);
    } catch (error) {
      showError(error);
    }
  }

  function showError(error: unknown) {
    setMessage(
      error instanceof Error
        ? error.message
        : "로그인 후 다시 시도해 주세요.",
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-panel-strong p-5">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={toggleLike}
          aria-pressed={liked}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${liked ? "bg-red-50 text-red-700" : "border border-line"}`}
        >
          <Heart className={`size-4 ${liked ? "fill-current" : ""}`} />
          좋아요 {likeCount}
        </button>
        <button
          onClick={() => (comments ? setComments(null) : void loadComments())}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          <MessageCircle className="size-4" /> 댓글 {commentCount}
        </button>
        <button
          onClick={() => setReportOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          <ShieldAlert className="size-4" /> 신고
        </button>
      </div>
      {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
      {comments && (
        <div className="mt-5">
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              placeholder="댓글을 입력하세요"
              className="min-w-0 flex-1 rounded-full border border-line bg-background px-4 py-2 text-sm"
            />
            <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-background">
              등록
            </button>
          </form>
          <ul className="mt-4 space-y-3">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-xl bg-panel p-3 text-sm">
                <strong>@{comment.author.handle}</strong>
                <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {reportOpen && (
        <form onSubmit={report} className="mt-5 grid gap-3 rounded-xl bg-panel p-4">
          <select name="reason" className="rounded-lg border border-line bg-background p-2 text-sm">
            <option value="SPAM">스팸</option>
            <option value="HARASSMENT">괴롭힘</option>
            <option value="VIOLENCE">폭력</option>
            <option value="COPYRIGHT">저작권</option>
            <option value="OTHER">기타</option>
          </select>
          <textarea name="details" maxLength={1000} placeholder="신고 사유를 설명해 주세요" className="min-h-20 rounded-lg border border-line bg-background p-3 text-sm" />
          <button className="w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-background">
            신고 제출
          </button>
        </form>
      )}
    </section>
  );
}
