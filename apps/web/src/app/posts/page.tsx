import { CommunityPage } from "@/features/community/community-page";
import { getCommunityCategories, getCommunityPosts } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const [categories, posts] = await Promise.all([
    getCommunityCategories(),
    getCommunityPosts(),
  ]);
  return <CommunityPage categories={categories} posts={posts} />;
}
