import { promises as fs } from "fs";
import path from "path";
import { defaultDesignTokens, type DesignTokens } from "@/lib/design-tokens";

const themePath = path.join(process.cwd(), "config", "theme.json");
const defaultThemePath = path.join(process.cwd(), "config", "theme.default.json");

async function readJsonFile(filePath: string): Promise<Partial<DesignTokens>> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as Partial<DesignTokens>;
}

export async function readThemeFile(): Promise<DesignTokens> {
  try {
    const data = await readJsonFile(themePath);
    return { ...defaultDesignTokens, ...data };
  } catch {
    try {
      const data = await readJsonFile(defaultThemePath);
      return { ...defaultDesignTokens, ...data };
    } catch {
      return defaultDesignTokens;
    }
  }
}

export async function writeThemeFile(tokens: DesignTokens): Promise<DesignTokens> {
  const merged = { ...defaultDesignTokens, ...tokens };
  await fs.writeFile(themePath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return merged;
}

export async function resetThemeFile(): Promise<DesignTokens> {
  let defaults = defaultDesignTokens;
  try {
    defaults = { ...defaultDesignTokens, ...(await readJsonFile(defaultThemePath)) };
  } catch {
    // keep code defaults
  }
  await fs.writeFile(themePath, `${JSON.stringify(defaults, null, 2)}\n`, "utf8");
  return defaults;
}
