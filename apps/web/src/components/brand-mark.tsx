import Link from "next/link";

export function BrandMark() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5"
      aria-label="Stream 홈"
    >
      <span className="grid size-8 place-items-center rounded-[11px] bg-ink text-sm font-black text-white transition-transform group-hover:-rotate-3">
        S
      </span>
      <span className="text-lg font-bold tracking-[-0.035em]">stream</span>
    </Link>
  );
}
