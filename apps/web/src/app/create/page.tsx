import { CreateCommunityPostForm } from "@/features/community/create-community-post-form";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  return <CreateCommunityPostForm categorySlug={category} />;
}
