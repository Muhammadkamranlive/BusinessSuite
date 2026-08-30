/**
 * Design tokens — defaults live in code + config/theme.default.json
 * Active theme is persisted in config/theme.json via /api/theme
 */

export type DesignTokens = {
  ink: string;
  cloud: string;
  line: string;
  teal: string;
  coral: string;
  amber: string;
  mint: string;
  radius: string;
  inputHeight: string;
  focusRing: string;
};

export const defaultDesignTokens: DesignTokens = {
  ink: "#0f2452",
  cloud: "#eef5f1",
  line: "#d4e4db",
  teal: "#1877f2",
  coral: "#e41e3f",
  amber: "#87b8f8",
  mint: "#226fd9",
  radius: "0.5rem",
  inputHeight: "2.5rem",
  focusRing: "#1877f2"
};

export function applyDesignTokens(tokens: Partial<DesignTokens>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const merged = { ...defaultDesignTokens, ...tokens };
  root.style.setProperty("--bs-ink", merged.ink);
  root.style.setProperty("--bs-cloud", merged.cloud);
  root.style.setProperty("--bs-line", merged.line);
  root.style.setProperty("--bs-teal", merged.teal);
  root.style.setProperty("--bs-coral", merged.coral);
  root.style.setProperty("--bs-amber", merged.amber);
  root.style.setProperty("--bs-mint", merged.mint);
  root.style.setProperty("--bs-radius", merged.radius);
  root.style.setProperty("--bs-input-height", merged.inputHeight);
  root.style.setProperty("--bs-focus", merged.focusRing);
}

/** Load active theme from config/theme.json through the API. */
export async function fetchDesignTokens(): Promise<DesignTokens> {
  try {
    const res = await fetch("/api/theme", { cache: "no-store" });
    if (!res.ok) return defaultDesignTokens;
    const data = (await res.json()) as { theme?: DesignTokens };
    return { ...defaultDesignTokens, ...(data.theme ?? {}) };
  } catch {
    return defaultDesignTokens;
  }
}

/** Persist theme to config/theme.json */
export async function saveDesignTokens(tokens: DesignTokens): Promise<DesignTokens> {
  const res = await fetch("/api/theme", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tokens)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Failed to save theme");
  }
  const data = (await res.json()) as { theme: DesignTokens };
  applyDesignTokens(data.theme);
  return data.theme;
}

/** Restore config/theme.json from config/theme.default.json */
export async function resetDesignTokens(): Promise<DesignTokens> {
  const res = await fetch("/api/theme", { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Failed to reset theme");
  }
  const data = (await res.json()) as { theme: DesignTokens };
  applyDesignTokens(data.theme);
  return data.theme;
}
