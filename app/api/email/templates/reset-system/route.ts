import { proxyToEmailApi } from "@/lib/email/server";

export const runtime = "nodejs";

export async function POST() {
  return proxyToEmailApi("/templates/reset-system", { method: "POST" });
}
