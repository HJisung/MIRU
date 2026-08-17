import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, getCommunityPost } from "@/lib/api";
import { mediaUrl } from "@/lib/client-api";
import { relativeDate } from "@/lib/format";
import { VideoPlayer } from "@/components/video-player";

export const dynamic = "force-dynamic";

export default async function CommunityPostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await getCommunityPost(postId).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href={post.category ? `/posts/c/${post.category.slug}` : "/posts"}
        className="text-sm text-muted hover:text-ink"
      >
        ← {post.category?.name ?? "Post Home"}
      </Link>
      <article className="mt-5 rounded-2xl border border-line bg-panel-strong p-5">
        <div className="text-sm">
          <strong>{post.author.displayName}</strong>{" "}
          <span className="text-muted">
            @{post.author.handle} · {relativeDate(post.publishedAt)}
          </span>
        </div>
        <p className="mt-4 whitespace-pre-wrap leading-7">{post.body}</p>
        {post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block rounded-xl border border-line p-4 text-sm underline"
          >
            {safeLinkLabel(post.linkUrl)}
          </a>
        )}
        <div className="mt-5 grid gap-3">
          {post.type === "IMAGE" && post.media.map((media) => (
            <div
              key={media.id}
              className="relative aspect-[16/9] overflow-hidden rounded-xl"
            >
              <Image
                src={mediaUrl(media.url)}
                unoptimized={media.url.startsWith("/api/")}
                alt={post.body}
                fill
                className="object-cover"
                sizes="672px"
              />
            </div>
          ))}
          {post.type === "VIDEO" && post.media[0] && (
            <div className="aspect-video overflow-hidden rounded-xl bg-black">
              <VideoPlayer
                source={post.media[0].url}
                poster={post.media[0].posterUrl}
              />
            </div>
          )}
        </div>
      </article>
    </main>
  );
}

function safeLinkLabel(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}
