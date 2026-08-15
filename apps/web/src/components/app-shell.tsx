"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Clapperboard,
  FileText,
  Home,
  Menu,
  PlaySquare,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";
import { BrandMark } from "./brand-mark";

const navigation = [
  { label: "홈", description: "롱폼 영상", href: "/", icon: Home },
  { label: "숏폼", description: "짧은 영상", href: "/shorts", icon: PlaySquare },
  { label: "포스트", description: "사진과 이야기", href: "/posts", icon: FileText },
  { label: "팔로잉", description: "구독한 채널", href: "/following", icon: Users },
  { label: "보관함", description: "저장한 콘텐츠", href: "/saved", icon: Bookmark },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-background/90 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setOpen(true)} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-black/5" aria-label="메뉴 열기" aria-expanded={open}>
            <Menu className="size-5" />
          </button>
          <BrandMark />
          <div className="mx-auto hidden h-10 w-full max-w-xl items-center gap-2 rounded-full border border-line bg-panel-strong px-4 sm:flex">
            <Search className="size-4 text-muted" aria-hidden="true" />
            <span className="truncate text-sm text-muted">영상, 포스트, 크리에이터 검색</span>
            <kbd className="ml-auto rounded-md border bg-background px-1.5 py-0.5 text-[10px] text-muted">⌘ K</kbd>
          </div>
          <Link href="/create" className="flex h-10 items-center gap-2 rounded-full bg-ink px-3.5 text-sm font-semibold text-white hover:bg-ink/90"><Upload className="size-4" /><span className="hidden sm:inline">업로드</span></Link>
          <Link href="/auth" className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent" aria-label="내 프로필">ME</Link>
        </div>
      </header>

      <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
        <button aria-label="메뉴 닫기" onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/45 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
        <aside className={`absolute inset-y-0 left-0 flex w-[19rem] max-w-[86vw] flex-col border-r border-line bg-panel-strong px-5 py-5 shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between"><BrandMark /><button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-black/5" aria-label="메뉴 닫기"><X className="size-5" /></button></div>
          <nav className="mt-9 space-y-1" aria-label="주요 메뉴">
            {navigation.map(({ label, description, href, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${active ? "bg-ink text-white" : "hover:bg-black/5"}`}><Icon className="size-[19px] shrink-0" /><span><span className="block text-sm font-semibold">{label}</span><span className={`block text-[11px] ${active ? "text-white/55" : "text-muted"}`}>{description}</span></span></Link>;
            })}
          </nav>
          <div className="mt-6 border-t border-line pt-5"><p className="px-3 text-[11px] font-bold tracking-[0.16em] text-muted">CREATOR</p><Link href="/create" className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-black/5"><Clapperboard className="size-[19px]" /> 새 콘텐츠 만들기</Link></div>
          <div className="mt-auto rounded-2xl bg-[#e7eadf] p-4"><p className="text-sm font-semibold">당신의 이야기를 시작하세요.</p><p className="mt-1 text-xs leading-5 text-muted">긴 영상, 짧은 순간, 한 장의 사진을 각자의 공간에 올릴 수 있어요.</p></div>
        </aside>
      </div>

      <main>{children}</main>
    </div>
  );
}
