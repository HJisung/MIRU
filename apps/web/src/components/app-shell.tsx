import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bookmark,
  Compass,
  Home,
  Menu,
  PlaySquare,
  Search,
  Upload,
  Users,
} from "lucide-react";
import { BrandMark } from "./brand-mark";

const navigation = [
  { label: "홈", href: "/", icon: Home, active: false },
  { label: "둘러보기", href: "/", icon: Compass, active: true },
  { label: "숏폼", href: "/shorts", icon: PlaySquare, active: false },
  { label: "팔로잉", href: "/following", icon: Users, active: false },
  { label: "보관함", href: "/saved", icon: Bookmark, active: false },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-background/90 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:pl-[17rem] lg:pr-8">
          <button
            className="grid size-10 place-items-center rounded-full hover:bg-black/5 lg:hidden"
            aria-label="메뉴 열기"
          >
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="mx-auto flex h-10 w-full max-w-xl items-center gap-2 rounded-full border border-line bg-panel-strong px-4 shadow-[0_1px_0_rgba(20,28,24,0.04)]">
            <Search className="size-4 text-muted" aria-hidden="true" />
            <span className="truncate text-sm text-muted">
              크리에이터, 영상, 주제 검색
            </span>
            <kbd className="ml-auto hidden rounded-md border bg-background px-1.5 py-0.5 text-[10px] text-muted sm:block">
              ⌘ K
            </kbd>
          </div>
          <Link href="/create" className="hidden h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/90 sm:flex">
            <Upload className="size-4" /> 업로드
          </Link>
          <Link href="/auth"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent"
            aria-label="내 프로필"
          >
            ME
          </Link>
        </div>
      </header>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r bg-panel px-5 py-5 lg:flex lg:flex-col">
        <BrandMark />
        <nav className="mt-10 space-y-1" aria-label="주요 메뉴">
          {navigation.map(({ label, href, icon: Icon, active }) => (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${active ? "bg-ink text-white" : "text-muted hover:bg-black/5 hover:text-ink"}`}
            >
              <Icon className="size-[18px]" strokeWidth={active ? 2.3 : 1.8} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#e7eadf] p-4">
          <p className="text-sm font-semibold">당신의 이야기도 들려주세요.</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            사진 한 장부터 긴 영상까지 자유롭게 시작할 수 있어요.
          </p>
          <Link href="/create" className="mt-3 block w-full rounded-xl bg-panel-strong px-3 py-2 text-center text-xs font-semibold shadow-sm">
            첫 게시물 만들기
          </Link>
        </div>
      </aside>
      <main className="lg:pl-64">{children}</main>
      <nav
        className="fixed inset-x-3 bottom-3 z-50 flex h-16 items-center justify-around rounded-2xl border bg-panel-strong/95 px-2 shadow-[0_12px_40px_rgba(24,32,28,0.16)] backdrop-blur-xl lg:hidden"
        aria-label="모바일 메뉴"
      >
        {navigation.slice(0, 4).map(({ label, href, icon: Icon, active }) => (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-14 flex-col items-center gap-1 text-[10px] ${active ? "text-accent" : "text-muted"}`}
          >
            <Icon className="size-5" strokeWidth={active ? 2.5 : 1.8} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
