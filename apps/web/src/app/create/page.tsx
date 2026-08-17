import { CreateCommunityPostForm } from "@/features/community/create-community-post-form";
import { CreateHomeVideoForm } from "@/features/home/create-home-video-form";
import { CreateProductVideoForm } from "@/features/media/create-product-video-form";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string }>;
}) {
  const { category, type } = await searchParams;
  if (type === "video") return <CreateHomeVideoForm />;
  if (type === "series-single")
    return <CreateProductVideoForm mode="series-single" />;
  if (type === "series-episode")
    return <CreateProductVideoForm mode="series-episode" />;
  if (type === "shortform-video")
    return <CreateProductVideoForm mode="shortform" />;
  return <CreateCommunityPostForm categorySlug={category} />;
}
