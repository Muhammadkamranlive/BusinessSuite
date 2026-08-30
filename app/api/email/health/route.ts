import { proxyToEmailApi } from "@/lib/email/server";

export const runtime = "nodejs";

export async function GET() {
  return proxyToEmailApi("/health");
}
