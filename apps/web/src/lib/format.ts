export function compactNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
export function relativeDate(value: string) {
  const days = Math.round(
    (new Date(value).getTime() - Date.now()) / 86_400_000,
  );
  return new Intl.RelativeTimeFormat("ko-KR", { numeric: "auto" }).format(
    days,
    "day",
  );
}
export function duration(value: number | null) {
  if (!value) return null;
  const totalSeconds = Math.floor(value / 1000),
    hours = Math.floor(totalSeconds / 3600),
    minutes = Math.floor((totalSeconds % 3600) / 60),
    seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
