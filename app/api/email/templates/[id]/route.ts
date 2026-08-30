import { proxyToEmailApi } from "@/lib/email/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyToEmailApi(`/templates/${encodeURIComponent(id)}`);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.text();
  return proxyToEmailApi(`/templates/${encodeURIComponent(id)}`, { method: "PUT", body });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyToEmailApi(`/templates/${encodeURIComponent(id)}`, { method: "DELETE" });
}
