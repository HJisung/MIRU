import { PlaylistDetail } from "@/features/playlists/playlist-detail";

export const dynamic = "force-dynamic";
export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  return <PlaylistDetail playlistId={(await params).playlistId} />;
}
