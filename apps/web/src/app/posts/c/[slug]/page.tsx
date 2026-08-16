import { notFound } from "next/navigation";
import { CommunityPage } from "@/features/community/community-page";
import { getCommunityCategories, getCommunityPosts } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CategoryPostsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categories = await getCommunityCategories();
  if (!categories.items.some((category) => category.slug === slug)) notFound();
  const posts = await getCommunityPosts(slug);
  return (
    <CommunityPage categories={categories} posts={posts} activeSlug={slug} />
  );
}
