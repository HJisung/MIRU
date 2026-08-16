export const clientApiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function clientApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${clientApiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(" · ")
      : (body?.message ?? "요청을 처리하지 못했습니다.");
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function mediaUrl(url: string) {
  return url.startsWith("/api/")
    ? `${clientApiUrl.replace(/\/api\/v1$/, "")}${url}`
    : url;
}
