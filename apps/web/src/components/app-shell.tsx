"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Clapperboard, FileText, Home, Layers3, Menu, Moon, PlaySquare, Search, Sun, Upload, Users, X } from "lucide-react";
import { BrandMark } from "./brand-mark";

const navigation = [
  { label: "홈", description: "Single과 Collection", href: "/", icon: Home },
  { label: "시리즈", description: "영화와 에피소드 작품", href: "/series", icon: Layers3 },
  { label: "숏폼", description: "짧은 영상", href: "/shorts", icon: PlaySquare },
  { label: "포스트", description: "사진과 이야기", href: "/posts", icon: FileText },
  { label: "팔로잉", description: "구독한 채널", href: "/following", icon: Users },
  { label: "보관함", description: "저장한 콘텐츠", href: "/saved", icon: Bookmark },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const focusedViewing = pathname.startsWith("/watch/");

  useEffect(() => {
    function close(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return <div className="min-h-screen">
    <header className="sticky top-0 z-40 border-b border-line/80 bg-background/90 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button onClick={() => setOpen(true)} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="메뉴 열기" aria-expanded={open}><Menu className="size-5" /></button>
        <BrandMark />
        <div className="mx-auto hidden h-10 w-full max-w-xl items-center gap-2 rounded-full border border-line bg-panel-strong px-4 sm:flex"><Search className="size-4 text-muted" /><span className="truncate text-sm text-muted">영상, 포스트, 크리에이터 검색</span><kbd className="ml-auto rounded-md border bg-background px-1.5 py-0.5 text-[10px] text-muted">⌘ K</kbd></div>
        <button type="button" onClick={() => { const root = document.documentElement; const dark = root.classList.toggle("dark"); localStorage.setItem("miru-theme", dark ? "dark" : "light"); }} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="색상 모드 전환"><Moon className="size-4 dark:hidden" /><Sun className="hidden size-4 dark:block" /></button>
        <Link href="/create" className="flex h-10 items-center gap-2 rounded-full bg-ink px-3.5 text-sm font-semibold text-white"><Upload className="size-4" /><span className="hidden sm:inline">업로드</span></Link>
        <Link href="/auth" className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent" aria-label="내 프로필">ME</Link>
      </div>
    </header>

    {!focusedViewing && <aside className="fixed inset-y-16 left-0 z-30 hidden w-[4.5rem] flex-col items-center border-r border-line bg-panel-strong py-4 md:flex"><nav className="space-y-2" aria-label="빠른 메뉴">{navigation.slice(0, 4).map(({ label, href, icon: Icon }) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} className={`flex w-14 flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] transition ${active ? "bg-ink text-white" : "text-muted hover:bg-black/5 dark:hover:bg-white/10"}`}><Icon className="size-[19px]" /><span>{label}</span></Link>; })}</nav></aside>}

    <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      <button aria-label="메뉴 닫기" onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/45 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
      <aside className={`absolute inset-y-0 left-0 flex w-[19rem] max-w-[86vw] flex-col border-r border-line bg-panel-strong px-5 py-5 shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between"><BrandMark /><button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="메뉴 닫기"><X className="size-5" /></button></div>
        <nav className="mt-9 space-y-1" aria-label="주요 메뉴">{navigation.map(({ label, description, href, icon: Icon }) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${active ? "bg-ink text-white" : "hover:bg-black/5 dark:hover:bg-white/10"}`}><Icon className="size-[19px] shrink-0" /><span><span className="block text-sm font-semibold">{label}</span><span className={`block text-[11px] ${active ? "text-white/55" : "text-muted"}`}>{description}</span></span></Link>; })}</nav>
        <div className="mt-6 border-t border-line pt-5"><Link href="/create" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"><Clapperboard className="size-[19px]" /> 새 콘텐츠 만들기</Link></div>
      </aside>
    </div>

    <main className={focusedViewing ? "" : "md:pl-[4.5rem]"}>{children}</main>
  </div>;
}
