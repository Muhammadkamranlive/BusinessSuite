import { proxyToEmailApi } from "@/lib/email/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  return proxyToEmailApi(`/templates${qs ? `?${qs}` : ""}`);
}

export async function POST(req: Request) {
  const body = await req.text();
  return proxyToEmailApi("/templates", { method: "POST", body });
}
