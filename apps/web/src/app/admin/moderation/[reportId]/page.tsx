import { ModerationAdmin } from "@/features/moderation/moderation-admin";

export default async function ModerationDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  return <ModerationAdmin reportId={reportId} />;
}
