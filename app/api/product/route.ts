import { NextResponse } from "next/server";
import { defaultProductBrand, type ProductBrand } from "@/lib/product-brand";
import { readProductBrandFile, resetProductBrandFile, writeProductBrandFile } from "@/lib/product/product-file";

export const runtime = "nodejs";

function isValidBrand(body: unknown): body is ProductBrand {
  if (!body || typeof body !== "object") return false;
  const data = body as Record<string, unknown>;
  return (
    typeof data.productName === "string" &&
    data.productName.trim().length > 0 &&
    typeof data.productTagline === "string" &&
    typeof data.legalName === "string"
  );
}

export async function GET() {
  const brand = await readProductBrandFile();
  return NextResponse.json(
    { ok: true, brand, source: "config/product.json" },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!isValidBrand(body)) {
      return NextResponse.json({ ok: false, message: "Product name is required." }, { status: 400 });
    }
    const brand = await writeProductBrandFile({
      productName: body.productName,
      productTagline: body.productTagline || defaultProductBrand.productTagline,
      legalName: body.legalName || defaultProductBrand.legalName
    });
    return NextResponse.json({ ok: true, brand, message: "Product name saved to config/product.json" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to save product name" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const brand = await resetProductBrandFile();
    return NextResponse.json({ ok: true, brand, message: "Product name reset to defaults" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to reset product name" },
      { status: 500 }
    );
  }
}
