export interface ReadyPlaybackAsset {
  id: string;
  publicUrl: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
}

export function toPlayableMedia(asset: ReadyPlaybackAsset | null) {
  if (!asset?.publicUrl || !asset.mimeType || !asset.width || !asset.height) {
    return null;
  }
  return {
    id: asset.id,
    url: asset.publicUrl,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    durationMs: asset.durationMs,
  };
}
