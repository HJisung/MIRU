import { HomeGrid } from "@/features/home/home-grid";
import { getCollections, getHomeVideos } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [videos, collections] = await Promise.all([getHomeVideos(), getCollections()]);
  return <div className="w-full px-3 pb-20 pt-5 sm:px-5 lg:px-7"><HomeGrid videos={videos} collections={collections} /></div>;
}
