import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-bold tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        이 게시물을 찾을 수 없어요.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        삭제되었거나 공개되지 않은 게시물일 수 있습니다.
      </p>
      <Link
        href="/"
        className="mt-7 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-background"
      >
        둘러보기
      </Link>
    </div>
  );
}
