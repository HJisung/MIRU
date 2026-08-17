import { clientApi } from "@/lib/client-api";

export type ProcessingResult =
  | { status: "READY" }
  | { status: "FAILED"; failureCode: string | null }
  | { status: "TIMEOUT" };

export async function waitForVideoProcessing(
  assetId: string,
  options: { attempts?: number; intervalMs?: number } = {},
): Promise<ProcessingResult> {
  const attempts = options.attempts ?? 60;
  const intervalMs = options.intervalMs ?? 2_000;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const asset = await clientApi<{
      status: string;
      failureCode: string | null;
    }>(`/media/video-assets/${assetId}/status`);
    if (asset.status === "READY") return { status: "READY" };
    if (asset.status === "FAILED") {
      return { status: "FAILED", failureCode: asset.failureCode };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { status: "TIMEOUT" };
}
