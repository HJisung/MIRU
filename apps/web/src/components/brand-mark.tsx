import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";

export function BrandMark() {
  const shared = "h-auto w-full object-contain transition-transform group-hover:scale-[1.02]";
  return <Link href="/" className="group inline-flex h-10 w-[7.5rem] shrink-0 items-center" aria-label={`${brand.displayName} 홈`}>
    <Image src={brand.assets.lockupDark} alt={brand.displayName} width={120} height={40} priority className={`${shared} dark:hidden`} />
    <Image src={brand.assets.lockupLight} alt="" width={120} height={40} priority className={`${shared} hidden dark:block`} />
  </Link>;
}
