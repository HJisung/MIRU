"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";
import { mediaUrl } from "@/lib/client-api";

export function VideoPlayer({
  source,
  poster,
}: {
  source: string;
  poster?: string | null;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const url = mediaUrl(source);
    if (video.canPlayType("application/vnd.apple.mpegurl")) video.src = url;
    else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
  }, [source]);
  return (
    <video
      ref={ref}
      controls
      preload="metadata"
      poster={poster ? mediaUrl(poster) : undefined}
      className="h-full w-full bg-black object-contain"
    >
      브라우저가 영상 재생을 지원하지 않습니다.
    </video>
  );
}
