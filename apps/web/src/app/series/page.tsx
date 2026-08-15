import Image from "next/image";
import Link from "next/link";
import { Layers3, Play } from "lucide-react";
import { getSeriesList } from "@/lib/api";
import { mediaUrl } from "@/lib/client-api";

export const dynamic = "force-dynamic";

export default async function SeriesPage() {
  const works = await getSeriesList();
  return <div className="mx-auto w-full max-w-[112rem] px-4 pb-20 pt-8 sm:px-6 lg:px-10"><header className="mb-8"><p className="text-xs font-bold tracking-[0.2em] text-muted">MIRU SERIES</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">작품으로 만나는 이야기</h1><p className="mt-2 text-sm text-muted">검토와 승인을 거쳐 공개된 영화, 다큐멘터리, 에피소드 작품입니다.</p></header><section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{works.items.map((work) => { const media = work.episodes[0]?.publication.media[0]; return <Link key={work.id} href={`/series/${work.id}`} className="group overflow-hidden rounded-3xl border border-line bg-panel-strong"><div className="relative aspect-[16/10] bg-black">{media && <Image src={mediaUrl(media.url)} unoptimized={media.url.startsWith("/api/")} alt={work.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.02]" />}<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /><span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white"><Layers3 className="size-3.5" />{work.workType === "EPISODIC" ? `${work.episodes.length}부작` : "단일 작품"}</span><Play className="absolute bottom-5 right-5 size-6 fill-white text-white" /></div><div className="p-5"><h2 className="text-xl font-semibold tracking-[-0.025em]">{work.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{work.synopsis}</p><div className="mt-4 flex flex-wrap gap-2">{work.genres.map((genre) => <span key={genre} className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">{genre}</span>)}</div></div></Link>; })}</section></div>;
}
