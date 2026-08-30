import { proxyToEmailApi } from "@/lib/email/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  return proxyToEmailApi("/templates/preview", { method: "POST", body });
}
