import { SeriesEditor } from "@/features/studio/series-editor";

export default async function StudioSeriesDetailPage({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;
  return <SeriesEditor seriesId={seriesId} />;
}
