import type {
  CommunityCategoryList,
  CommunityPostList,
} from "@stream/api-contract";
import Link from "next/link";
import { PostTimeline } from "@/features/feed/post-timeline";

export function CommunityPage({
  categories,
  posts,
  activeSlug,
}: {
  categories: CommunityCategoryList;
  posts: CommunityPostList;
  activeSlug?: string;
}) {
  const active = categories.items.find(
    (category) => category.slug === activeSlug,
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-20 sm:px-6 lg:px-8">
      <nav
        aria-label="포스트 카테고리"
        className="mb-5 flex gap-2 overflow-x-auto pb-1"
      >
        <Link
          href="/posts"
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!activeSlug ? "bg-ink text-background" : "bg-panel"}`}
        >
          Post Home
        </Link>
        {categories.items.map((category) => (
          <Link
            key={category.id}
            href={`/posts/c/${category.slug}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${activeSlug === category.slug ? "bg-ink text-background" : "bg-panel"}`}
          >
            {category.name}
          </Link>
        ))}
      </nav>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,44rem)_18rem]">
        <main>
          <PostTimeline feed={posts} />
        </main>
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-line bg-panel-strong p-5">
            <h2 className="font-semibold">
              {active ? `${active.name}에 게시` : "Post Home에 게시"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {active?.description ||
                "카테고리를 선택하지 않은 자유로운 이야기입니다."}
            </p>
            <Link
              href={active ? `/create?category=${active.slug}` : "/create"}
              className="mt-5 block rounded-xl bg-ink px-4 py-3 text-center text-sm font-semibold text-background"
            >
              새 포스트 작성
            </Link>
            <Link
              href="/posts/manage"
              className="mt-2 block rounded-xl border border-line px-4 py-3 text-center text-sm font-semibold"
            >
              내 포스트 관리
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
