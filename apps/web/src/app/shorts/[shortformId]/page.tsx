import { notFound } from "next/navigation";
import { ShortsFeed } from "@/features/feed/shorts-feed";
import { ApiError, getShortform } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ShortformPage({
  params,
}: {
  params: Promise<{ shortformId: string }>;
}) {
  const item = await findShortform((await params).shortformId);
  return <ShortsFeed feed={{ items: [item] }} />;
}

async function findShortform(shortformId: string) {
  try {
    return await getShortform(shortformId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
