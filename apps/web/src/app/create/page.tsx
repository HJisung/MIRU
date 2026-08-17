import { CreateCommunityPostForm } from "@/features/community/create-community-post-form";
import { CreateHomeVideoForm } from "@/features/home/create-home-video-form";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string }>;
}) {
  const { category, type } = await searchParams;
  if (type === "video") return <CreateHomeVideoForm />;
  return <CreateCommunityPostForm categorySlug={category} />;
}
