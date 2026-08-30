export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 12000
): Promise<{ ok: true; res: Response; json: T } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const json = (await res.json()) as T;
    return { ok: true, res, json };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Request timed out"
        : error instanceof Error
          ? error.message
          : "Failed to fetch";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
