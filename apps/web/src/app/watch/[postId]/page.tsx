import { redirect } from "next/navigation";

export default async function LegacyWatchRoute({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  redirect(`/watch/home/${(await params).postId}`);
}
